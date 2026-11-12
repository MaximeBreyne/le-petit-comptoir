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
    void Interact(EComptoirTarget Target, int32 CustomerSlot=-1);
    void ChooseGlass(int32 RecipeIndex);
    void Pour(EComptoirTarget Target, float DeltaSeconds);
    bool Save(bool Feedback = false,int32 Slot=0);
    bool Load(bool Feedback = false,int32 Slot=0);
    ComptoirSession::Flow Session;
    FString BarName=TEXT("Le Petit Comptoir");
    FString PendingBarName=TEXT("Le Petit Comptoir");
    FString SaveSummary;
    FString SlotSummaries[4];bool SlotValid[4]={false,false,false,false};
    FString Confirmation;int32 PendingSlot=-1;bool bPendingLoad=false;
    float Sensitivity=1,FieldOfView=75,Brightness=100;bool bInvertY=false;
    void RefreshSlots();void LoadPreferences();void SettingsAction(FName Action);
    bool IsBarNameValid(const FString& Name) const;
    void MenuAction(FName Action);
    void DeveloperAction(FName Action);
    void TogglePauseMenu();
    void Notify(const FString& Text);
    FString Prompt(EComptoirTarget Target, int32 CustomerSlot=-1) const;
    bool CanReachTabletTarget(EComptoirTarget Target, int32 CustomerSlot=-1) const;
private:
    UPROPERTY() TObjectPtr<class ACameraActor> HomeCamera;
    void RefreshContinue();
    void ApplyMenuState();
    void ApplyBarName();
    void StartNewSession();
    UPROPERTY() TArray<TObjectPtr<AComptoirProp>> Customers;
    UPROPERTY() TObjectPtr<AComptoirProp> ServiceSign;
    UPROPERTY() TArray<TObjectPtr<AComptoirScene>> CustomerSeated;
    UPROPERTY() TArray<TObjectPtr<AComptoirScene>> CustomerStanding;
    UPROPERTY() TArray<TObjectPtr<AComptoirScene>> CustomerDrinks;
    UPROPERTY() TArray<TObjectPtr<AComptoirScene>> TrayVisuals;
    UPROPERTY() TObjectPtr<AComptoirScene> PreparationVisual;
    UPROPERTY() TArray<TObjectPtr<AComptoirScene>> FridgeVisuals;
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
