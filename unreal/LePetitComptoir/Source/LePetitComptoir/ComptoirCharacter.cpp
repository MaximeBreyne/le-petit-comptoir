#include "ComptoirCharacter.h"
#include "ComptoirExposure.h"
#include "ComptoirGameMode.h"
#include "ComptoirHUD.h"
#include "ComptoirProp.h"
#include "WorldLayout.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Engine/World.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

AComptoirCharacter::AComptoirCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    GetCapsuleComponent()->InitCapsuleSize(30, 90);
    Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    Camera->SetupAttachment(GetCapsuleComponent());
    Camera->SetRelativeLocation(FVector(0, 0, 78));
    Camera->bUsePawnControlRotation = true;
    ComptoirExposure::Apply(Camera->PostProcessSettings);
    // The browser used a 75 degree vertical FOV; Unreal's camera uses horizontal FOV.
    Camera->SetFieldOfView(107.51f);
    bUseControllerRotationYaw = true;
    GetCharacterMovement()->MaxWalkSpeed = 220;
    GetCharacterMovement()->bOrientRotationToMovement = false;
}

void AComptoirCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis(TEXT("Forward"), this, &AComptoirCharacter::Forward);
    Input->BindAxis(TEXT("Right"), this, &AComptoirCharacter::Right);
    Input->BindAxis(TEXT("Turn"), this, &AComptoirCharacter::Turn);
    Input->BindAxis(TEXT("Look"), this, &AComptoirCharacter::Look);
    Input->BindAction(TEXT("Interact"), IE_Pressed, this, &AComptoirCharacter::Interact);
    Input->BindAction(TEXT("Pour"), IE_Pressed, this, &AComptoirCharacter::StartPour);
    Input->BindAction(TEXT("Pour"), IE_Released, this, &AComptoirCharacter::StopPour);
    Input->BindAction(TEXT("Sprint"), IE_Pressed, this, &AComptoirCharacter::StartSprint);
    Input->BindAction(TEXT("Sprint"), IE_Released, this, &AComptoirCharacter::StopSprint);
    Input->BindAction(TEXT("PauseGame"), IE_Pressed, this, &AComptoirCharacter::PauseGame).bExecuteWhenPaused = true;
    Input->BindAction(TEXT("SaveGame"), IE_Pressed, this, &AComptoirCharacter::SaveGame);
    Input->BindAction(TEXT("LoadGame"), IE_Pressed, this, &AComptoirCharacter::LoadGame);
    Input->BindAction(TEXT("Discard"), IE_Pressed, this, &AComptoirCharacter::Discard);
    Input->BindAction(TEXT("Dismiss"), IE_Pressed, this, &AComptoirCharacter::Dismiss);
    Input->BindAction(TEXT("Tablet"), IE_Pressed, this, &AComptoirCharacter::ToggleTablet);
}

void AComptoirCharacter::Forward(float Value) { if (!bMenuBlocked&&!bTabletOpen&&!bGlassPicker) AddMovementInput(GetActorForwardVector(), FMath::Clamp(Value, -1.f, 1.f)); }
void AComptoirCharacter::Right(float Value) { if (!bMenuBlocked&&!bTabletOpen&&!bGlassPicker) AddMovementInput(GetActorRightVector(), FMath::Clamp(Value, -1.f, 1.f)); }
void AComptoirCharacter::Turn(float Value) { if (!bMenuBlocked&&!bTabletOpen&&!bGlassPicker) {const auto* G=GetWorld()->GetAuthGameMode<AComptoirGameMode>();AddControllerYawInput(Value*.7f*(G?G->Sensitivity:1));} }
void AComptoirCharacter::Look(float Value) { if (!bMenuBlocked&&!bTabletOpen&&!bGlassPicker) {const auto* G=GetWorld()->GetAuthGameMode<AComptoirGameMode>();AddControllerPitchInput(Value*.7f*(G?G->Sensitivity:1)*(G&&G->bInvertY?-1:1));} }
void AComptoirCharacter::StartSprint() { GetCharacterMovement()->MaxWalkSpeed = 400; }
void AComptoirCharacter::StopSprint() { GetCharacterMovement()->MaxWalkSpeed = 220; }
void AComptoirCharacter::StartPour() { bPouring = !bMenuBlocked&&!bTabletOpen&&!bGlassPicker; }
void AComptoirCharacter::StopPour() { bPouring = false; }

AComptoirProp* AComptoirCharacter::FocusedProp() const
{
    FHitResult Hit;
    const FVector Start = Camera->GetComponentLocation();
    FCollisionQueryParams Params(SCENE_QUERY_STAT(ComptoirInteract), false, this);
    if (GetWorld()->LineTraceSingleByChannel(Hit, Start, Start + Camera->GetForwardVector() * 300, ECC_Visibility, Params))
        return Cast<AComptoirProp>(Hit.GetActor());
    return nullptr;
}

void AComptoirCharacter::Interact()
{
    if (bMenuBlocked||bTabletOpen||bGlassPicker) return;
    if (IsInReserve()) { OpenTablet(3); return; }
    if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>())
        if (const AComptoirProp* Prop = FocusedProp())
        {
            if (Prop->Target==EComptoirTarget::Stock) OpenTablet(3);
            else Game->Interact(Prop->Target,Prop->CustomerSlot);
        }
}

bool AComptoirCharacter::IsInReserve() const
{
    const FVector P=GetActorLocation();
    return ComptoirWorld::InReserve(P.X,P.Y,P.Z);
}

void AComptoirCharacter::OpenTablet(int32 Page)
{
    if (bMenuBlocked||UGameplayStatics::IsGamePaused(this)) return;
    if (!bTabletOpen) ToggleTablet();
    if (APlayerController* PC=Cast<APlayerController>(GetController()))
        if (AComptoirHUD* HUD=Cast<AComptoirHUD>(PC->GetHUD())) HUD->SelectTabletPage(Page);
}

void AComptoirCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    const auto* Settings=GetWorld()->GetAuthGameMode<AComptoirGameMode>();
    ComptoirExposure::Apply(Camera->PostProcessSettings,Settings?Settings->Brightness:100.f);
    if (const APlayerController* Player = Cast<APlayerController>(GetController()))
    {
        int32 Width = 0, Height = 0;
        Player->GetViewportSize(Width, Height);
        if (Width > 0 && Height > 0)
            Camera->SetFieldOfView(FMath::RadiansToDegrees(2.f * FMath::Atan(FMath::Tan(FMath::DegreesToRadians((Settings?Settings->FieldOfView:75.f)*.5f)) * Width / Height)));
    }
    if (!bPouring) return;
    if (const AComptoirProp* Prop = FocusedProp())
        if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>()) Game->Pour(Prop->Target,DeltaSeconds);
}

void AComptoirCharacter::PauseGame()
{
    if(AComptoirGameMode* Game=GetWorld()->GetAuthGameMode<AComptoirGameMode>())Game->TogglePauseMenu();
}
void AComptoirCharacter::SetMenuBlocked(bool Blocked)
{
    bMenuBlocked=Blocked;bTabletOpen=false;bGlassPicker=false;bPouring=false;StopSprint();
    GetCharacterMovement()->StopMovementImmediately();
    if(APlayerController* Player=Cast<APlayerController>(GetController()))
    {
        Player->ResetIgnoreMoveInput();Player->ResetIgnoreLookInput();
        Player->SetIgnoreMoveInput(Blocked);Player->SetIgnoreLookInput(Blocked);
        Player->bShowMouseCursor=Blocked;Player->bEnableClickEvents=Blocked;
        if(Blocked)
        {
            FInputModeGameAndUI Mode;Mode.SetHideCursorDuringCapture(false);
            Mode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);Player->SetInputMode(Mode);
        }
        else Player->SetInputMode(FInputModeGameOnly());
    }
}
void AComptoirCharacter::ToggleTablet()
{
    if (bMenuBlocked||UGameplayStatics::IsGamePaused(this)) return;
    if(bGlassPicker){SetGlassPicker(false);return;}
    bTabletOpen = !bTabletOpen;
    bPouring = false;
    StopSprint();
    if (APlayerController* Player = Cast<APlayerController>(GetController()))
    {
        Player->bShowMouseCursor = bTabletOpen;
        Player->bEnableClickEvents = bTabletOpen;
        if (bTabletOpen)
        {
            if (IsInReserve())
                if (AComptoirHUD* HUD=Cast<AComptoirHUD>(Player->GetHUD())) HUD->SelectTabletPage(3);
            FInputModeGameAndUI Mode;
            Mode.SetHideCursorDuringCapture(false);
            Mode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
            Player->SetInputMode(Mode);
        }
        else Player->SetInputMode(FInputModeGameOnly());
    }
}
void AComptoirCharacter::SaveGame()
{
    if(bMenuBlocked)return;
    if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>()) Game->Save(true);
}
void AComptoirCharacter::LoadGame()
{
    if(bMenuBlocked)return;
    bPouring = false;SetGlassPicker(false);
    if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>()) Game->Load(true);
}
void AComptoirCharacter::Discard()
{
    if (bMenuBlocked||bTabletOpen||bGlassPicker) return;
    bPouring = false;
    if (const AComptoirProp* Prop = FocusedProp())
        if (Prop->Target==EComptoirTarget::Fridge||Prop->Target==EComptoirTarget::Tap||Prop->Target==EComptoirTarget::Wine||Prop->Target==EComptoirTarget::Coffee||Prop->Target==EComptoirTarget::GlassRack)
            if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>())
                if (Game->Simulation.Discard()) { Game->Notify(TEXT("Verre range ou boisson jetee.")); Game->Save(); }
}
void AComptoirCharacter::Dismiss()
{
    if (bMenuBlocked||bTabletOpen||bGlassPicker) return;
    if (const AComptoirProp* Prop = FocusedProp())
        if (Prop->Target == EComptoirTarget::Customer)
            if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>())
                if (Game->Simulation.Dismiss(Prop->CustomerSlot)) { Game->Notify(TEXT("Commande refusee. Le client est parti.")); Game->Save(); }
}

void AComptoirCharacter::SetGlassPicker(bool Open,bool Cold)
{
    if(bMenuBlocked)return;
    bColdPicker=Open&&Cold;
    bGlassPicker=Open;bTabletOpen=false;bPouring=false;StopSprint();
    GetCharacterMovement()->StopMovementImmediately();
    if(APlayerController* Player=Cast<APlayerController>(GetController()))
    {
        Player->bShowMouseCursor=Open;Player->bEnableClickEvents=Open;
        if(Open)
        {
            FInputModeGameAndUI Mode;Mode.SetHideCursorDuringCapture(false);
            Mode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);Player->SetInputMode(Mode);
        }
        else Player->SetInputMode(FInputModeGameOnly());
    }
}
