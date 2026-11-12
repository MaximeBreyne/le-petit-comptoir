#include "ComptoirCharacter.h"
#include "ComptoirGameMode.h"
#include "ComptoirProp.h"
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
    Camera->SetFieldOfView(85);
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
}

void AComptoirCharacter::Forward(float Value) { AddMovementInput(GetActorForwardVector(), FMath::Clamp(Value, -1.f, 1.f)); }
void AComptoirCharacter::Right(float Value) { AddMovementInput(GetActorRightVector(), FMath::Clamp(Value, -1.f, 1.f)); }
void AComptoirCharacter::Turn(float Value) { AddControllerYawInput(Value * .7f); }
void AComptoirCharacter::Look(float Value) { AddControllerPitchInput(Value * .7f); }
void AComptoirCharacter::StartSprint() { GetCharacterMovement()->MaxWalkSpeed = 400; }
void AComptoirCharacter::StopSprint() { GetCharacterMovement()->MaxWalkSpeed = 220; }
void AComptoirCharacter::StartPour() { bPouring = true; }
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
    if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>())
        if (const AComptoirProp* Prop = FocusedProp()) Game->Interact(Prop->Target);
}

void AComptoirCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if (!bPouring) return;
    if (const AComptoirProp* Prop = FocusedProp())
        if (Prop->Target == EComptoirTarget::Tap)
            if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>()) Game->Pour(DeltaSeconds);
}

void AComptoirCharacter::PauseGame()
{
    bPouring = false;
    StopSprint();
    UGameplayStatics::SetGamePaused(this, !UGameplayStatics::IsGamePaused(this));
}
void AComptoirCharacter::SaveGame()
{
    if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>()) Game->Save(true);
}
void AComptoirCharacter::LoadGame()
{
    bPouring = false;
    if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>()) Game->Load(true);
}
void AComptoirCharacter::Discard()
{
    bPouring = false;
    if (const AComptoirProp* Prop = FocusedProp())
        if (Prop->Target == EComptoirTarget::Tap)
            if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>())
                if (Game->Simulation.Discard()) { Game->Notify(TEXT("Verre range ou boisson jetee.")); Game->Save(); }
}
void AComptoirCharacter::Dismiss()
{
    if (const AComptoirProp* Prop = FocusedProp())
        if (Prop->Target == EComptoirTarget::Customer)
            if (AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>())
                if (Game->Simulation.Dismiss()) { Game->Notify(TEXT("Commande refusee. Le client est parti.")); Game->Save(); }
}
