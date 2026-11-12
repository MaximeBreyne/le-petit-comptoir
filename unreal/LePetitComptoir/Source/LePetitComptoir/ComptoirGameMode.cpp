#include "ComptoirGameMode.h"
#include "ComptoirCharacter.h"
#include "ComptoirHUD.h"
#include "ComptoirSave.h"
#include "Components/PointLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/PointLight.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

namespace
{
    // Avoid generic globals that trigger MSVC shadowing errors in Unreal templates.
    const FString GComptoirSaveSlotName = TEXT("LePetitComptoir_Unreal_Pilot_v1");
}

AComptoirGameMode::AComptoirGameMode()
{
    PrimaryActorTick.bCanEverTick = true;
    DefaultPawnClass = AComptoirCharacter::StaticClass();
    HUDClass = AComptoirHUD::StaticClass();
}

void AComptoirGameMode::BeginPlay()
{
    Super::BeginPlay();
    BuildRoom();
    Load();
    UpdateVisuals();
    if (bReadyToSave) Notify(TEXT("Bienvenue ! E pour interagir, P pour mettre en pause."));
}

void AComptoirGameMode::EndPlay(const EEndPlayReason::Type Reason)
{
    if (bReadyToSave) Save();
    Super::EndPlay(Reason);
}

AComptoirProp* AComptoirGameMode::Make(const FVector& Position, const FVector& Size,
    const FLinearColor& Color, EComptoirTarget Target, const FString& Caption)
{
    FActorSpawnParameters Params;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    AComptoirProp* Prop = GetWorld()->SpawnActor<AComptoirProp>(Position, FRotator::ZeroRotator, Params);
    if (Prop) Prop->Configure(Size, Color, Target, Caption);
    return Prop;
}

void AComptoirGameMode::BuildRoom()
{
    const FLinearColor Green(.045f, .12f, .09f), Wood(.24f, .12f, .055f), Cream(.62f, .57f, .42f), Gold(.65f, .39f, .10f);
    Make(FVector(0, 0, -10), FVector(1200, 1000, 20), Wood);
    Make(FVector(-610, 0, 170), FVector(20, 1020, 360), Green);
    Make(FVector(610, 0, 170), FVector(20, 1020, 360), Green);
    Make(FVector(0, -510, 170), FVector(1200, 20, 360), Green);
    Make(FVector(0, 510, 170), FVector(1200, 20, 360), Cream);
    Make(FVector(0, 0, 350), FVector(1200, 1000, 20), Cream);
    Make(FVector(0, -180, 48), FVector(800, 100, 96), Green);
    Make(FVector(0, -180, 101), FVector(830, 115, 10), Wood);
    Make(FVector(0, -478, 100), FVector(780, 45, 16), Wood);
    Make(FVector(-150, -240, 135), FVector(30, 30, 65), Gold, EComptoirTarget::Tap, TEXT("TIREUSE"));
    Make(FVector(150, -420, 120), FVector(70, 35, 35), Cream, EComptoirTarget::GlassRack, TEXT("VERRES"));
    Make(FVector(270, -240, 130), FVector(55, 35, 45), Green, EComptoirTarget::Till, TEXT("CAISSE / CARTE"));
    Make(FVector(-500, -130, 145), FVector(90, 16, 70), Gold, EComptoirTarget::Sign, TEXT("OUVERTURE"));
    Make(FVector(-500, -400, 75), FVector(75, 70, 150), Wood, EComptoirTarget::Stock, TEXT("RESERVE"));
    for (int32 X : {-350, 350})
    {
        for (int32 Y : {170, 370})
        {
            Make(FVector(X, Y, 76), FVector(110, 80, 8), Wood);
            Make(FVector(X, Y, 38), FVector(15, 15, 76), Gold);
            Make(FVector(X, Y - 70, 42), FVector(42, 42, 8), Green);
            Make(FVector(X, Y - 90, 70), FVector(42, 8, 60), Green);
        }
    }
    Customer = Make(FVector(0, -25, 96), FVector(42, 34, 90), FLinearColor(.12f, .20f, .35f), EComptoirTarget::Customer, TEXT("CLIENT"));
    CustomerHead = Make(FVector(0, -25, 156), FVector(30, 30, 30), FLinearColor(.65f, .40f, .26f), EComptoirTarget::Customer);
    BeerVisual = Make(FVector(-115, -240, 117), FVector(14, 14, 22), Gold);
    if (BeerVisual) BeerVisual->SetActorEnableCollision(false);
    for (int32 X : {-350, 350})
    {
        for (int32 Y : {-300, 250})
        {
            APointLight* Light = GetWorld()->SpawnActor<APointLight>(FVector(X, Y, 290), FRotator::ZeroRotator);
            if (Light)
            {
                if (UPointLightComponent* Point = Cast<UPointLightComponent>(Light->GetLightComponent()))
                {
                    Point->SetMobility(EComponentMobility::Movable);
                    Point->SetLightColor(FLinearColor(1.f, .86f, .65f));
                    Point->SetIntensity(3500.f);
                    Point->SetAttenuationRadius(950.f);
                }
            }
        }
    }
}

void AComptoirGameMode::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    const int PreviousSold = Simulation.Sold;
    const int PreviousDay = Simulation.Day;
    Simulation.Tick(DeltaSeconds);
    MessageRemaining = FMath::Max(0.f, MessageRemaining - DeltaSeconds);
    UpdateVisuals();
    if (Simulation.Sold > PreviousSold) { Notify(TEXT("Paiement confirme : +5 EUR.")); Save(); }
    if (Simulation.Day > PreviousDay) { Notify(TEXT("Service termine : 35 EUR de charges. E sur le panneau pour le soir suivant.")); Save(); }
    AutosaveRemaining -= DeltaSeconds;
    if (AutosaveRemaining <= 0) { Save(); AutosaveRemaining = 5; }
}

void AComptoirGameMode::UpdateVisuals()
{
    const bool Visible = Simulation.Phase != Comptoir::Customer::None;
    FVector Position(0, -25, 96);
    if (Simulation.Phase == Comptoir::Customer::Walking)
        Position = FMath::Lerp(Position, FVector(270, -25, 96), 1.f - static_cast<float>(Simulation.CustomerRemaining / 3.0));
    else if (Simulation.Phase == Comptoir::Customer::Payment || Simulation.Phase == Comptoir::Customer::Processing) Position.X = 270;
    if (Customer) { Customer->SetActorHiddenInGame(!Visible); Customer->SetActorEnableCollision(Visible); Customer->SetActorLocation(Position); }
    if (CustomerHead) { CustomerHead->SetActorHiddenInGame(!Visible); CustomerHead->SetActorEnableCollision(Visible); CustomerHead->SetActorLocation(Position + FVector(0, 0, 60)); }
    if (BeerVisual)
    {
        BeerVisual->SetActorHiddenInGame(Simulation.Held != Comptoir::Glass::Filling);
        BeerVisual->Mesh->SetWorldScale3D(FVector(.14, .14, FMath::Max(.01, Simulation.Amount / 50.0 * .22)));
    }
}

void AComptoirGameMode::Notify(const FString& Text) { Message = Text; MessageRemaining = 7; }

void AComptoirGameMode::Interact(EComptoirTarget Target)
{
    bool Changed = false;
    switch (Target)
    {
        case EComptoirTarget::Sign: Changed = Simulation.ToggleService(); break;
        case EComptoirTarget::GlassRack: Changed = Simulation.TakeGlass(); break;
        case EComptoirTarget::Tap: Changed = Simulation.TakeBeer(); break;
        case EComptoirTarget::Customer: Changed = Simulation.InteractCustomer(); break;
        case EComptoirTarget::Till: Changed = Simulation.PayCard(); break;
        case EComptoirTarget::Stock: Changed = Simulation.Supply(); break;
        default: return;
    }
    Notify(Changed ? TEXT("Action effectuee.") : Prompt(Target));
    UpdateVisuals();
    if (Changed) Save();
}

void AComptoirGameMode::Pour(float DeltaSeconds)
{
    const auto Before = Simulation.Held;
    if (!Simulation.Pour(DeltaSeconds)) return;
    if (Before != Simulation.Held) Save();
}

FString AComptoirGameMode::Prompt(EComptoirTarget Target) const
{
    if (Simulation.Bankrupt()) return TEXT("Tresorerie negative : partie terminee.");
    switch (Target)
    {
        case EComptoirTarget::Sign:
            return Simulation.Closing ? TEXT("Derniere tournee : terminez le service du client.") : Simulation.Open ? TEXT("E - Derniere tournee puis fermeture (-35 EUR)") : TEXT("E - Ouvrir le bar");
        case EComptoirTarget::GlassRack:
            return Simulation.Held == Comptoir::Glass::None ? TEXT("E - Prendre une pinte vide") : TEXT("Vous avez deja un verre. R sur la tireuse pour le jeter/ranger.");
        case EComptoirTarget::Tap:
            if (Simulation.Held == Comptoir::Glass::None) return TEXT("Prenez d'abord une pinte au rangement VERRES.");
            if (Simulation.Held == Comptoir::Glass::Full) return TEXT("Biere sur le plateau : servez le client (E).");
            if (Simulation.Held == Comptoir::Glass::Empty && Simulation.Beer < 50) return TEXT("Stock insuffisant : utilisez la RESERVE.");
            return Simulation.Amount >= 50 ? TEXT("E - Recuperer la biere / R - Jeter") : TEXT("Maintenir clic gauche en visant la tireuse : doser 50 cl");
        case EComptoirTarget::Customer:
            if (Simulation.Phase == Comptoir::Customer::Order) return TEXT("E - Prendre la commande : une biere / X - Refuser");
            if (Simulation.Phase == Comptoir::Customer::Drink) return TEXT("E - Servir une biere du plateau / X - Refuser");
            if (Simulation.Phase == Comptoir::Customer::Drinking) return TEXT("Le client deguste sa biere.");
            return TEXT("Le client rejoint la caisse. Encaissez avec E sur la CAISSE.");
        case EComptoirTarget::Till:
            if (Simulation.Phase == Comptoir::Customer::Payment) return TEXT("E - Encaisser 5 EUR par carte (3 secondes)");
            if (Simulation.Phase == Comptoir::Customer::Processing) return TEXT("Paiement carte en cours...");
            return TEXT("Aucun client pret a payer.");
        case EComptoirTarget::Stock:
            if (Simulation.Reserve > 0) return Simulation.Beer < 1000 ? TEXT("E - Transferer la biere vers le comptoir") : TEXT("Comptoir plein (1000 cl).");
            if (Simulation.DeliveryRemaining > 0) return TEXT("Commande en route : livraison en reserve sous 10 secondes.");
            return TEXT("E - Commander 500 cl pour 16 EUR (fonds necessaires)");
        default: return FString();
    }
}

void AComptoirGameMode::Save(bool Feedback)
{
    if (!bReadyToSave) return;
    UComptoirSave* Data = Cast<UComptoirSave>(UGameplayStatics::CreateSaveGameObject(UComptoirSave::StaticClass()));
    if (!Data) return;
    const std::string Payload = Simulation.Serialize();
    Data->Simulation = UTF8_TO_TCHAR(Payload.c_str());
    if (const APawn* Player = UGameplayStatics::GetPlayerPawn(this, 0))
    {
        Data->PlayerLocation = Player->GetActorLocation();
        Data->PlayerRotation = Player->GetControlRotation();
    }
    const bool Saved = UGameplayStatics::SaveGameToSlot(Data, GComptoirSaveSlotName, 0);
    if (!Saved) Notify(TEXT("Echec de sauvegarde : verifiez l'espace disque."));
    else if (Feedback) Notify(TEXT("Partie Unreal sauvegardee."));
}

void AComptoirGameMode::Load(bool Feedback)
{
    if (!UGameplayStatics::DoesSaveGameExist(GComptoirSaveSlotName, 0))
    {
        bReadyToSave = true;
        if (Feedback) Notify(TEXT("Aucune sauvegarde Unreal."));
        return;
    }
    UComptoirSave* Data = Cast<UComptoirSave>(UGameplayStatics::LoadGameFromSlot(GComptoirSaveSlotName, 0));
    if (!Data || !Simulation.Restore(TCHAR_TO_UTF8(*Data->Simulation)))
    {
        // Do not overwrite a corrupt or unsupported save on the next autosave.
        bReadyToSave = false;
        Notify(TEXT("Sauvegarde illisible : sauvegarde automatique suspendue. Voir README."));
        return;
    }
    bReadyToSave = true;
    if (APawn* Player = UGameplayStatics::GetPlayerPawn(this, 0))
    {
        const FVector P = Data->PlayerLocation;
        if (!P.ContainsNaN() && !Data->PlayerRotation.ContainsNaN() &&
            FMath::Abs(P.X) < 550 && FMath::Abs(P.Y) < 450 && P.Z > 70 && P.Z < 180)
            Player->TeleportTo(P, Data->PlayerRotation, false, false);
        if (AController* Controller = Player->GetController())
            if (!Data->PlayerRotation.ContainsNaN()) Controller->SetControlRotation(Data->PlayerRotation);
    }
    UpdateVisuals();
    if (Feedback) Notify(TEXT("Partie Unreal chargee."));
}
