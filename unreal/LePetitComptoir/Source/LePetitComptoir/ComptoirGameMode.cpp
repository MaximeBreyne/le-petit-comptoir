#include "ComptoirGameMode.h"
#include "ComptoirCharacter.h"
#include "ComptoirHUD.h"
#include "ComptoirSave.h"
#include "ComptoirScene.h"
#include "ComptoirStreetLife.h"
#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "WorldLayout.h"
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
    int RecipeForTarget(EComptoirTarget Target)
    {
        return Target==EComptoirTarget::Tap?0:Target==EComptoirTarget::Wine?1:Target==EComptoirTarget::Coffee?2:-1;
    }
    FVector SeatPosition(int Slot){return FVector(430,460+Slot*140,0);}
    FVector StationPosition(Comptoir::Recipe Recipe)
    {
        return Recipe==Comptoir::Recipe::Beer?FVector(272,415,113.3):
            Recipe==Comptoir::Recipe::Wine?FVector(110,290,106):FVector(247,843,115.2);
    }
    FString DrinkModel(Comptoir::Recipe Recipe,int Level)
    {return FString::Printf(TEXT("drink_%s_%d"),UTF8_TO_TCHAR(Comptoir::Drink(Recipe).Key),Level);}
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
    HomeCamera=GetWorld()->SpawnActor<ACameraActor>(FVector(850,1050,172),FRotator(-2.58,224.03,0));
    if(HomeCamera)HomeCamera->GetCameraComponent()->SetFieldOfView(107.51f);
    RefreshContinue();
    UpdateVisuals();
    ApplyMenuState();
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
            HasVenue = It->GetGeometryRevision() >= 6 || It->Build(TEXT("world"), true);
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
    Target(FVector(92,290,125),FVector(40,38,60),EComptoirTarget::Wine);
    Target(FVector(247,843,148),FVector(55,80,65),EComptoirTarget::Coffee);
    Target(FVector(85, 700, 130), FVector(45, 125, 65), EComptoirTarget::GlassRack);
    Target(FVector(288, 265, 144), FVector(50, 70, 65), EComptoirTarget::Till);
    Target(FVector(-350, 230, 130), FVector(70, 350, 180), EComptoirTarget::Stock);
    Target(FVector(1002,600,140),FVector(65,280,240),EComptoirTarget::Door);
    ServiceSign = Make(FVector(976, 920, 191), FVector(1.2, 102, 48),
        FLinearColor(.08f,.12f,.09f), EComptoirTarget::Sign);
    if (ServiceSign)
    {
        ServiceSign->Label->SetWorldLocation(FVector(974, 920, 191));
        ServiceSign->Label->SetWorldSize(11);
        ServiceSign->Label->SetWorldRotation(FRotator(0, 180, 0));
    }
    const auto Model = [&](const FString& Collection)
    {
        AComptoirScene* Actor=GetWorld()->SpawnActor<AComptoirScene>();
        if(Actor&&!Actor->UseModel(Collection))Notify(TEXT("Modèles absents : relancez Setup-Unreal.ps1."));
        if(Actor)Actor->SetModelShadows(Collection.StartsWith(TEXT("guest")));
        return Actor;
    };
    for(int I=0;I<Comptoir::Game::MaxCustomers;++I)
    {
        AComptoirProp* Person=Target(SeatPosition(I)+FVector(0,0,130),FVector(55,60,150),EComptoirTarget::Customer);
        if(Person)Person->CustomerSlot=I;
        Customers.Add(Person);
        CustomerSeated.Add(Model(FString::Printf(TEXT("guest%d_seated"),I)));
        CustomerStanding.Add(Model(FString::Printf(TEXT("guest%d_standing"),I)));
        CustomerDrinks.Add(Model(DrinkModel(Comptoir::Recipe::Beer,8)));
    }
    PreparationVisual=Model(DrinkModel(Comptoir::Recipe::Beer,0));
    for(int I=0;I<Comptoir::Game::TrayCapacity;++I)TrayVisuals.Add(Model(DrinkModel(Comptoir::Recipe::Beer,8)));
    DoorLeft=GetWorld()->SpawnActor<AComptoirScene>();
    DoorRight=GetWorld()->SpawnActor<AComptoirScene>();
    if(DoorLeft) { if(!DoorLeft->Build(TEXT("doorLeft"),true))Notify(TEXT("Porte absente : relancez Setup-Unreal.ps1."));DoorLeft->SetActorLocation(FVector(1002,455,0)); }
    if(DoorRight) { if(!DoorRight->Build(TEXT("doorRight"),true))Notify(TEXT("Porte absente : relancez Setup-Unreal.ps1."));DoorRight->SetActorLocation(FVector(1002,745,0)); }
    GetWorld()->SpawnActor<AComptoirStreetLife>();

}

void AComptoirGameMode::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if(!Session.CanSimulate())return;
    const APawn* Player=UGameplayStatics::GetPlayerPawn(this,0);
    if(!bDoorOpen&&DoorAngle>0&&Player)
    {
        const FVector P=Player->GetActorLocation();
        if(ComptoirWorld::BlocksDoorClosing(P.X,P.Y))bDoorOpen=true;
    }
    const float PreviousAngle=DoorAngle;
    DoorAngle=FMath::FInterpConstantTo(DoorAngle,bDoorOpen?90.f:0.f,DeltaSeconds,105.f);
    if(DoorAngle!=PreviousAngle)
    {
        if(DoorLeft)DoorLeft->SetActorRotation(FRotator(0,-DoorAngle,0));
        if(DoorRight)DoorRight->SetActorRotation(FRotator(0,DoorAngle,0));
    }
    const int PreviousSold = Simulation.Sold;
    const int PreviousCash=Simulation.Cash;
    const int PreviousDay = Simulation.Day;
    Simulation.Tick(DeltaSeconds);
    MessageRemaining = FMath::Max(0.f, MessageRemaining - DeltaSeconds);
    UpdateVisuals();
    if (Simulation.Sold > PreviousSold) { Notify(FString::Printf(TEXT("Paiement confirmé : +%.2f €."),(Simulation.Cash-PreviousCash+(Simulation.Day>PreviousDay?Comptoir::Game::NightCost:0))/100.0)); Save(); }
    if (Simulation.Day > PreviousDay) { Notify(TEXT("Service termine : 35 EUR de charges. E sur le panneau pour le soir suivant.")); Save(); }
    AutosaveRemaining -= DeltaSeconds;
    if (AutosaveRemaining <= 0) { Save(); AutosaveRemaining = 5; }
}

void AComptoirGameMode::UpdateVisuals()
{
    using namespace Comptoir;
    for(int I=0;I<Game::MaxCustomers;++I)
    {
        const auto& C=Simulation.Guests[I];const bool Visible=C.Phase!=Customer::None;
        const bool Seated=C.Phase==Customer::Order||C.Phase==Customer::Drink||C.Phase==Customer::Drinking;
        int Rank=0;
        for(const auto& Other:Simulation.Guests)
            if(C.Phase!=Customer::Processing&&Other.Id>0&&Other.Id!=C.Id&&
                (Other.Phase==Customer::Processing||(Other.Id<C.Id&&(Other.Phase==Customer::Walking||Other.Phase==Customer::Payment))))++Rank;
        const FVector Queue(415+Rank*75,245,0);FVector Position=SeatPosition(I);
        if(C.Phase==Customer::Walking)
        {
            const float P=1.f-static_cast<float>(C.Remaining/3.0);
            const FVector A(550+Rank*20,Position.Y,0),B(550+Rank*20,245,0);
            Position=P<.2f?FMath::Lerp(Position,A,P/.2f):P<.8f?FMath::Lerp(A,B,(P-.2f)/.6f):FMath::Lerp(B,Queue,(P-.8f)/.2f);
        }
        else if(C.Phase==Customer::Payment||C.Phase==Customer::Processing)Position=Queue;
        if(Customers[I]){Customers[I]->SetActorEnableCollision(Visible);Customers[I]->SetActorLocation(Position+FVector(0,0,130));}
        if(CustomerSeated[I]){CustomerSeated[I]->SetActorHiddenInGame(!Visible||!Seated);CustomerSeated[I]->SetActorLocation(Position);}
        if(CustomerStanding[I]){CustomerStanding[I]->SetActorHiddenInGame(!Visible||Seated);CustomerStanding[I]->SetActorLocation(Position);}
        if(CustomerDrinks[I])
        {
            const bool Drinking=C.Phase==Customer::Drinking;CustomerDrinks[I]->SetActorHiddenInGame(!Drinking);
            if(Drinking){CustomerDrinks[I]->UseModel(DrinkModel(C.Requested,8));CustomerDrinks[I]->SetActorLocation(SeatPosition(I)+FVector(-90,0,113.3));}
        }
    }
    if(PreparationVisual)
    {
        PreparationVisual->SetActorHiddenInGame(Simulation.Held==Glass::None);
        if(Simulation.Held!=Glass::None)
        {
            const int Level=Simulation.Amount<=0?0:FMath::Clamp(FMath::CeilToInt(Simulation.Amount/Drink(Simulation.Vessel).Target*8),1,8);
            PreparationVisual->UseModel(DrinkModel(Simulation.Vessel,Level));
            PreparationVisual->SetActorLocation(StationPosition(Simulation.Vessel));
        }
    }
    for(int I=0;I<Game::TrayCapacity;++I)if(TrayVisuals[I])
    {
        const int R=Simulation.Tray[I];TrayVisuals[I]->SetActorHiddenInGame(R<0);
        if(R>=0){TrayVisuals[I]->UseModel(DrinkModel(static_cast<Recipe>(R),8));TrayVisuals[I]->SetActorLocation(FVector(285+(I/2)*32,498+(I%2)*26,113.3));}
    }
    if (ServiceSign) ServiceSign->Label->SetText(FText::FromString(Simulation.Closing?
        TEXT("DERNIERE TOURNEE\nFIN DU SERVICE"):Simulation.Open?TEXT("OUVERT\nFERMER LE BAR"):TEXT("FERME\nOUVRIR LE BAR")));
}

void AComptoirGameMode::Notify(const FString& Text) { Message = Text; MessageRemaining = 7; }

bool AComptoirGameMode::CanReachTabletTarget(EComptoirTarget Target,int32 Slot) const
{
    const APawn* Player=UGameplayStatics::GetPlayerPawn(this,0);
    if(!Player||Simulation.Bankrupt())return false;
    if(Target==EComptoirTarget::Customer&&Simulation.HasCustomer(Slot)&&Customers.IsValidIndex(Slot)&&Customers[Slot])
        return FVector::Dist2D(Player->GetActorLocation(),Customers[Slot]->GetActorLocation())<=300;
    if(Target==EComptoirTarget::Till)return FVector::Dist2D(Player->GetActorLocation(),FVector(288,265,144))<=300;
    if(Target==EComptoirTarget::GlassRack)return FVector::Dist2D(Player->GetActorLocation(),FVector(85,700,130))<=300;
    return false;
}

void AComptoirGameMode::ChooseGlass(int32 Index)
{
    if(!Session.CanSimulate()||!Comptoir::ValidRecipe(Index)||!CanReachTabletTarget(EComptoirTarget::GlassRack))return;
    if(Simulation.TakeGlass(static_cast<Comptoir::Recipe>(Index)))
    {
        Notify(FString::Printf(TEXT("%s choisi · rendez-vous au poste : %s."),UTF8_TO_TCHAR(Comptoir::Drinks[Index].Vessel),UTF8_TO_TCHAR(Comptoir::Drinks[Index].Station)));
        if(AComptoirCharacter* Player=Cast<AComptoirCharacter>(UGameplayStatics::GetPlayerPawn(this,0)))Player->SetGlassPicker(false);
        UpdateVisuals();Save();
    }
}

void AComptoirGameMode::Interact(EComptoirTarget Target,int32 Slot)
{
    if(!Session.CanSimulate())return;
    bool Changed=false;
    switch(Target)
    {
        case EComptoirTarget::Door:
        {
            const APawn* Player=UGameplayStatics::GetPlayerPawn(this,0);
            if(bDoorOpen&&Player&&ComptoirWorld::BlocksDoorClosing(Player->GetActorLocation().X,Player->GetActorLocation().Y))
            {Notify(TEXT("Éloignez-vous du passage pour fermer la porte."));return;}
            bDoorOpen=!bDoorOpen;Notify(bDoorOpen?TEXT("Porte ouverte : vous pouvez sortir dans la rue."):TEXT("Porte fermée."));return;
        }
        case EComptoirTarget::Sign:Changed=Simulation.ToggleService();break;
        case EComptoirTarget::GlassRack:
            if(AComptoirCharacter* Player=Cast<AComptoirCharacter>(UGameplayStatics::GetPlayerPawn(this,0)))Player->SetGlassPicker(true);
            return;
        case EComptoirTarget::Tap:case EComptoirTarget::Wine:case EComptoirTarget::Coffee:
            Changed=Simulation.FinishDrink(static_cast<Comptoir::Recipe>(RecipeForTarget(Target)));break;
        case EComptoirTarget::Customer:Changed=Simulation.InteractCustomer(Slot);break;
        case EComptoirTarget::Till:Changed=Simulation.PayCard();break;
        default:return;
    }
    Notify(Changed?TEXT("Action effectuée."):Prompt(Target,Slot));UpdateVisuals();if(Changed)Save();
}

void AComptoirGameMode::Pour(EComptoirTarget Target,float DeltaSeconds)
{
    if(!Session.CanSimulate())return;
    const int Index=RecipeForTarget(Target);if(Index<0)return;
    const auto Before=Simulation.Held;
    if(!Simulation.Pour(static_cast<Comptoir::Recipe>(Index),DeltaSeconds))return;
    if(Before!=Simulation.Held)Save();
}

FString AComptoirGameMode::Prompt(EComptoirTarget Target,int32 Slot) const
{
    using namespace Comptoir;
    if(Target==EComptoirTarget::Door)return bDoorOpen?TEXT("E - Fermer la porte"):TEXT("E - Ouvrir la porte et sortir");
    if(Simulation.Bankrupt())return TEXT("Trésorerie négative : partie terminée.");
    const int R=RecipeForTarget(Target);
    if(R>=0)
    {
        const auto& Info=Drinks[R];
        if(Simulation.Held==Glass::None)return FString::Printf(TEXT("%s : prenez un contenant au rangement VERRERIE (E)."),UTF8_TO_TCHAR(Info.Station));
        if(static_cast<int>(Simulation.Vessel)!=R)return FString::Printf(TEXT("Ce poste nécessite : %s. R pour ranger le contenant vide."),UTF8_TO_TCHAR(Info.Vessel));
        if(Simulation.Held==Glass::Empty&&Simulation.Stock[R]<Info.Use)return TEXT("Stock insuffisant : commandez dans la réserve.");
        if(Simulation.Amount>=Info.Target)return Simulation.TrayCount()>=Game::TrayCapacity?TEXT("Plateau plein : servez une boisson."):TEXT("E - Poser la boisson sur le plateau / R - Jeter");
        return FString::Printf(TEXT("%s : maintenir clic gauche pour doser %.0f %s / R - Ranger ou jeter"),UTF8_TO_TCHAR(Info.Name),Info.Target,UTF8_TO_TCHAR(Info.Unit));
    }
    switch(Target)
    {
        case EComptoirTarget::Sign:return Simulation.Closing?TEXT("Dernière tournée : terminez tous les clients."):Simulation.Open?TEXT("E - Dernière tournée puis fermeture (-35 €)"):TEXT("E - Ouvrir le bar");
        case EComptoirTarget::GlassRack:return TEXT("E - Choisir un verre ou une tasse");
        case EComptoirTarget::Customer:
        {
            if(!Simulation.HasCustomer(Slot))return {};
            const auto& C=Simulation.Guests[Slot];const FString Name=UTF8_TO_TCHAR(Drink(C.Requested).Name);
            if(C.Phase==Customer::Order)return FString::Printf(TEXT("Client #%d : E - Prendre la commande / X - Refuser"),C.Id);
            if(C.Phase==Customer::Drink)return FString::Printf(TEXT("Client #%d : %s · E - Servir depuis le plateau / X - Refuser"),C.Id,*Name);
            if(C.Phase==Customer::Drinking)return FString::Printf(TEXT("Client #%d déguste : %s"),C.Id,*Name);
            return TEXT("Le client attend son passage à la caisse.");
        }
        case EComptoirTarget::Till:
        {
            if(Simulation.ProcessingSlot()>=0)return TEXT("Paiement carte en cours…");
            const int I=Simulation.PaymentSlot();
            if(I>=0)return FString::Printf(TEXT("E - Encaisser le client #%d : %.2f €"),Simulation.Guests[I].Id,Drink(Simulation.Guests[I].Requested).Price/100.0);
            return TEXT("Aucun client prêt à payer.");
        }
        case EComptoirTarget::Stock:return TEXT("E / Tab - Gestion de la réserve");
        default:return {};
    }
}

bool AComptoirGameMode::Save(bool Feedback)
{
    if (!bReadyToSave||!Session.CanSave()) return false;
    UComptoirSave* Data = Cast<UComptoirSave>(UGameplayStatics::CreateSaveGameObject(UComptoirSave::StaticClass()));
    if (!Data) return false;
    const std::string Payload = Simulation.Serialize();
    Data->Simulation = UTF8_TO_TCHAR(Payload.c_str());
    Data->LayoutRevision = 3;
    Data->BarName=BarName;
    if (const APawn* Player = UGameplayStatics::GetPlayerPawn(this, 0))
    {
        Data->PlayerLocation = Player->GetActorLocation();
        Data->PlayerRotation = Player->GetControlRotation();
    }
    const bool Saved = UGameplayStatics::SaveGameToSlot(Data, GComptoirSaveSlotName, 0);
    if (!Saved) Notify(TEXT("Echec de sauvegarde : verifiez l'espace disque."));
    else if (Feedback) Notify(TEXT("Partie Unreal sauvegardee."));
    return Saved;
}

bool AComptoirGameMode::Load(bool Feedback)
{
    if (!UGameplayStatics::DoesSaveGameExist(GComptoirSaveSlotName, 0))
    {
        if (Feedback) Notify(TEXT("Aucune sauvegarde Unreal."));
        return false;
    }
    UComptoirSave* Data = Cast<UComptoirSave>(UGameplayStatics::LoadGameFromSlot(GComptoirSaveSlotName, 0));
    if (!Data || !Simulation.Restore(TCHAR_TO_UTF8(*Data->Simulation)))
    {
        // Do not overwrite a corrupt or unsupported save on the next autosave.
        bReadyToSave = false;
        Notify(TEXT("Sauvegarde illisible : sauvegarde automatique suspendue. Voir README."));
        return false;
    }
    bReadyToSave = true;
    BarName=IsBarNameValid(Data->BarName)?Data->BarName.TrimStartAndEnd():TEXT("Le Petit Comptoir");
    ApplyBarName();
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
        if (!Rotation.ContainsNaN() && ComptoirWorld::CanRestorePosition(P.X,P.Y,P.Z))
            Player->TeleportTo(P, Rotation, false, false);
        if (AController* Controller = Player->GetController())
            if (!Rotation.ContainsNaN()) Controller->SetControlRotation(Rotation);
    }
    UpdateVisuals();
    if (Feedback) Notify(TEXT("Partie Unreal chargee."));
    return true;
}
