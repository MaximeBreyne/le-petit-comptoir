#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "BarSimulation.h"
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
    void Save(bool Feedback = false);
    void Load(bool Feedback = false);
    void Notify(const FString& Text);
    FString Prompt(EComptoirTarget Target) const;
private:
    UPROPERTY() TObjectPtr<AComptoirProp> Customer;
    UPROPERTY() TObjectPtr<AComptoirProp> BeerVisual;
    UPROPERTY() TObjectPtr<AComptoirProp> ServiceSign;
    UPROPERTY() TObjectPtr<AComptoirScene> CustomerSeated;
    UPROPERTY() TObjectPtr<AComptoirScene> CustomerStanding;
    UPROPERTY() TObjectPtr<AComptoirScene> EmptyGlass;
    UPROPERTY() TObjectPtr<AComptoirScene> FullGlass;
    float AutosaveRemaining = 5;
    bool bReadyToSave = false;
    AComptoirProp* Make(const FVector& Position, const FVector& Size, const FLinearColor& Color,
        EComptoirTarget Target = EComptoirTarget::None, const FString& Caption = FString());
    void BuildRoom();
    void UpdateVisuals();
};
