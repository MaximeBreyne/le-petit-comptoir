#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "ComptoirSave.generated.h"

UCLASS()
class LEPETITCOMPTOIR_API UComptoirSave : public USaveGame
{
    GENERATED_BODY()
public:
    UPROPERTY(SaveGame) FString Simulation;
    UPROPERTY(SaveGame) FVector PlayerLocation = FVector(0, -350, 100);
    UPROPERTY(SaveGame) FRotator PlayerRotation = FRotator(0, 90, 0);
};
