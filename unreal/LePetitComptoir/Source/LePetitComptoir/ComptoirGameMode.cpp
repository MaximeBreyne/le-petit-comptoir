#include "ComptoirGameMode.h"
#include "ComptoirCharacter.h"
#include "ComptoirHUD.h"
#include "ComptoirSave.h"
#include "ComptoirScene.h"
#include "EngineUtils.h"
#include "Engine/StaticMesh.h"
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
    if (APawn* Player = UGameplayStatics::GetPlayerPawn(this, 0))
    {
        Player->TeleportTo(FVector(155, 600, 92), FRotator(0, 0, 0), false, true);
        if (AController* Controller = Player->GetController()) Controller->SetControlRotation(FRotator(-3.44, 0, 0));
    }
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
    bool HasVenue = false;
    for (TActorIterator<AComptoirScene> It(GetWorld()); It; ++It)
        if (It->ActorHasTag(TEXT("OriginalVenue")))
        {
            HasVenue = It->GetGeometryRevision() >= 3 || It->Build(TEXT("world"), true);
            break;
        }
    if (!HasVenue)
    {
        AComptoirScene* Venue = GetWorld()->SpawnActor<AComptoirScene>();
        if (!Venue || !Venue->Build(TEXT("world"), true))
            Notify(TEXT("Decor original absent : relancez Setup-Unreal.ps1."));
    }
    const auto Target = [&](const FVector& P, const FVector& Size, EComptoirTarget Kind)
    {
        AComptoirProp* Prop = Make(P, Size, FLinearColor::White, Kind);
        if (Prop)
        {
            Prop->Mesh->SetVisibility(false);
            Prop->Label->SetVisibility(false);
            Prop->Mesh->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
            Prop->Mesh->SetCollisionResponseToAllChannels(ECR_Ignore);
            Prop->Mesh->SetCollisionResponseToChannel(ECC_Visibility, ECR_Block);
        }
        return Prop;
    };
    Target(FVector(272, 415, 168), FVector(35, 95, 75), EComptoirTarget::Tap);
    Target(FVector(85, 700, 130), FVector(45, 125, 65), EComptoirTarget::GlassRack);
    Target(FVector(288, 265, 144), FVector(50, 70, 65), EComptoirTarget::Till);
    Target(FVector(-350, 230, 130), FVector(70, 350, 180), EComptoirTarget::Stock);
    ServiceSign = Make(FVector(976, 678, 191), FVector(1.2, 102, 48),
        FLinearColor(.08f,.12f,.09f), EComptoirTarget::Sign);
    if (ServiceSign)
    {
        ServiceSign->Label->SetWorldLocation(FVector(974, 678, 191));
        ServiceSign->Label->SetWorldSize(11);
        ServiceSign->Label->SetWorldRotation(FRotator(0, 180, 0));
    }
    Customer = Target(FVector(430, 600, 130), FVector(55, 60, 150), EComptoirTarget::Customer);
    const auto Model = [&](const TCHAR* Collection)
    {
        AComptoirScene* Actor = GetWorld()->SpawnActor<AComptoirScene>();
        if (Actor && !Actor->Build(Collection)) Notify(TEXT("Modeles absents : relancez Setup-Unreal.ps1."));
        return Actor;
    };
    CustomerSeated = Model(TEXT("customerSeated"));
    CustomerStanding = Model(TEXT("customerStanding"));
    EmptyGlass = Model(TEXT("glass"));
    FullGlass = Model(TEXT("beer"));
    if (EmptyGlass) EmptyGlass->SetActorLocation(FVector(272, 415, 113.3));
    if (FullGlass) FullGlass->SetActorLocation(FVector(285, 498, 113.3));
    BeerVisual = Make(FVector(272, 415, 115), FVector(13, 13, 1), FLinearColor(.69f,.38f,.07f));
    if (BeerVisual)
    {
        BeerVisual->Mesh->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,TEXT("/Engine/BasicShapes/Cylinder.Cylinder")));
        BeerVisual->SetActorEnableCollision(false);
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
    const bool Seated = Simulation.Phase == Comptoir::Customer::Order ||
        Simulation.Phase == Comptoir::Customer::Drink || Simulation.Phase == Comptoir::Customer::Drinking;
    FVector Position(430,600,0);
    if (Simulation.Phase == Comptoir::Customer::Walking)
    {
        const float Progress = 1.f - static_cast<float>(Simulation.CustomerRemaining / 3.0);
        if (Progress < .2f) Position = FMath::Lerp(Position, FVector(500, 600, 0), Progress / .2f);
        else if (Progress < .8f) Position = FMath::Lerp(FVector(500, 600, 0), FVector(500, 245, 0), (Progress-.2f)/.6f);
        else Position = FMath::Lerp(FVector(500, 245, 0), FVector(415, 245, 0), (Progress-.8f)/.2f);
    }
    else if (Simulation.Phase == Comptoir::Customer::Payment || Simulation.Phase == Comptoir::Customer::Processing)
        Position = FVector(415, 245, 0);
    if (Customer) { Customer->SetActorEnableCollision(Visible); Customer->SetActorLocation(Position+FVector(0, 0, 130)); }
    if (CustomerSeated) { CustomerSeated->SetActorHiddenInGame(!Visible || !Seated); CustomerSeated->SetActorLocation(Position); }
    if (CustomerStanding) { CustomerStanding->SetActorHiddenInGame(!Visible || Seated); CustomerStanding->SetActorLocation(Position); }
    const bool Filling = Simulation.Held == Comptoir::Glass::Filling;
    if (EmptyGlass) EmptyGlass->SetActorHiddenInGame(!Filling);
    if (FullGlass) FullGlass->SetActorHiddenInGame(Simulation.Held != Comptoir::Glass::Full);
    if (BeerVisual)
    {
        const double Height = FMath::Max(.1, Simulation.Amount / 50.0 * 25.5);
        BeerVisual->SetActorHiddenInGame(!Filling || Simulation.Amount <= 0);
        BeerVisual->Mesh->SetWorldScale3D(FVector(.13,.13,Height/100));
        BeerVisual->SetActorLocation(FVector(272,415,114.5+Height/2));
    }
    if (ServiceSign) ServiceSign->Label->SetText(FText::FromString(Simulation.Closing?
        TEXT("DERNIERE TOURNEE\nFIN DU SERVICE"):Simulation.Open?TEXT("OUVERT\nFERMER LE BAR"):TEXT("FERME\nOUVRIR LE BAR")));
}

void AComptoirGameMode::Notify(const FString& Text) { Message = Text; MessageRemaining = 7; }

bool AComptoirGameMode::CanReachTabletTarget(EComptoirTarget Target) const
{
    const APawn* Player = UGameplayStatics::GetPlayerPawn(this, 0);
    if (!Player || Simulation.Bankrupt()) return false;
    if (Target == EComptoirTarget::Customer && Customer && Simulation.Phase != Comptoir::Customer::None)
        return FVector::Dist2D(Player->GetActorLocation(), Customer->GetActorLocation()) <= 300;
    if (Target == EComptoirTarget::Till)
        return FVector::Dist2D(Player->GetActorLocation(), FVector(288, 265, 144)) <= 300;
    return false;
}

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
    Data->LayoutRevision = 3;
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
    if (APawn* Player = UGameplayStatics::GetPlayerPawn(this, 0); Player && (Data->LayoutRevision == 2 || Data->LayoutRevision == 3))
    {
        FVector P = Data->PlayerLocation;
        FRotator Rotation = Data->PlayerRotation;
        if (Data->LayoutRevision == 2)
        {
            // Keep the saved place and facing direction when fixing the mirrored layout.
            P = FVector(P.Y, P.X, P.Z);
            Rotation.Yaw = FRotator::NormalizeAxis(90 - Rotation.Yaw);
        }
        const bool InRoom = P.X > 30 && P.X < 960 && P.Y > 30 && P.Y < 1170;
        const bool InReserve = P.X > -390 && P.X < 0 && P.Y > 30 && P.Y < 430;
        if (!P.ContainsNaN() && !Rotation.ContainsNaN() &&
            (InRoom || InReserve) && P.Z > 70 && P.Z < 180)
            Player->TeleportTo(P, Rotation, false, false);
        if (AController* Controller = Player->GetController())
            if (!Rotation.ContainsNaN()) Controller->SetControlRotation(Rotation);
    }
    UpdateVisuals();
    if (Feedback) Notify(TEXT("Partie Unreal chargee."));
}
