#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "BarSimulation.h"
#include "SessionFlow.h"
#include "ComptoirProp.h"
#include "ComptoirGameMode.generated.h"

class AComptoirScene;

UCLASS()
class LEPETITCOMPTOIR_API AComptoirGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    AComptoirGameMode();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;
    Comptoir::Game Simulation;
    FString Message;
    float MessageRemaining = 0;
    void Interact(EComptoirTarget Target);
    void Pour(float DeltaSeconds);
    bool Save(bool Feedback = false);
    bool Load(bool Feedback = false);
    ComptoirSession::Flow Session;
    FString BarName=TEXT("Le Petit Comptoir");
    FString PendingBarName=TEXT("Le Petit Comptoir");
    FString SaveSummary;
    bool IsBarNameValid(const FString& Name) const;
    void MenuAction(FName Action);
    void DeveloperAction(FName Action);
    void TogglePauseMenu();
    void Notify(const FString& Text);
    FString Prompt(EComptoirTarget Target) const;
    bool CanReachTabletTarget(EComptoirTarget Target) const;
private:
    UPROPERTY() TObjectPtr<class ACameraActor> HomeCamera;
    void RefreshContinue();
    void ApplyMenuState();
    void ApplyBarName();
    void StartNewSession();
    UPROPERTY() TObjectPtr<AComptoirProp> Customer;
    UPROPERTY() TObjectPtr<AComptoirProp> BeerVisual;
    UPROPERTY() TObjectPtr<AComptoirProp> ServiceSign;
    UPROPERTY() TObjectPtr<AComptoirScene> CustomerSeated;
    UPROPERTY() TObjectPtr<AComptoirScene> CustomerStanding;
    UPROPERTY() TObjectPtr<AComptoirScene> EmptyGlass;
    UPROPERTY() TObjectPtr<AComptoirScene> FullGlass;
    UPROPERTY() TObjectPtr<AComptoirScene> DoorLeft;
    UPROPERTY() TObjectPtr<AComptoirScene> DoorRight;
    bool bDoorOpen=false;
    float DoorAngle=0;
    float AutosaveRemaining = 5;
    bool bReadyToSave = false;
    AComptoirProp* Make(const FVector& Position, const FVector& Size, const FLinearColor& Color,
        EComptoirTarget Target = EComptoirTarget::None, const FString& Caption = FString());
    void BuildRoom();
    void UpdateVisuals();
};
