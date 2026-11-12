#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "ComptoirCharacter.generated.h"

class UCameraComponent;
class AComptoirProp;

UCLASS()
class LEPETITCOMPTOIR_API AComptoirCharacter : public ACharacter
{
    GENERATED_BODY()
public:
    AComptoirCharacter();
    virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
    virtual void Tick(float DeltaSeconds) override;
    AComptoirProp* FocusedProp() const;
    bool IsTabletOpen() const { return bTabletOpen; }
    void ToggleTablet();
    void OpenTablet(int32 Page);
    bool IsInReserve() const;
    UPROPERTY(VisibleAnywhere) TObjectPtr<UCameraComponent> Camera;
private:
    bool bPouring = false;
    bool bTabletOpen = false;
    void Forward(float Value);
    void Right(float Value);
    void Turn(float Value);
    void Look(float Value);
    void Interact();
    void StartPour();
    void StopPour();
    void StartSprint();
    void StopSprint();
    void PauseGame();
    void SaveGame();
    void LoadGame();
    void Discard();
    void Dismiss();
};
