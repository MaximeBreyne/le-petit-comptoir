#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ComptoirStreetLife.generated.h"

class AComptoirScene;

UCLASS()
class LEPETITCOMPTOIR_API AComptoirStreetLife : public AActor
{
    GENERATED_BODY()
public:
    AComptoirStreetLife();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;
private:
    // Five reusable meshes per passer-by: torso/head, two legs, two arms.
    UPROPERTY() TArray<TObjectPtr<AComptoirScene>> People;
    UPROPERTY() TArray<TObjectPtr<AComptoirScene>> Cars;
    double Time=0;
    double CarY[2]={-2600,3300};
};
