#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "ComptoirSave.generated.h"

UCLASS()
class LEPETITCOMPTOIR_API UComptoirSave : public USaveGame
{
    GENERATED_BODY()
public:
    UPROPERTY(SaveGame) FString SavedAt;
    UPROPERTY(SaveGame) FString Simulation;
    UPROPERTY(SaveGame) FString BarName=TEXT("Le Petit Comptoir");
    UPROPERTY(SaveGame) FVector PlayerLocation = FVector(155, 600, 100);
    UPROPERTY(SaveGame) FRotator PlayerRotation = FRotator(-3.44, 0, 0);
    // Older saves have no layout revision; retain progress but reset their old room position.
    UPROPERTY(SaveGame) int32 LayoutRevision = 0;
};

UCLASS()
class LEPETITCOMPTOIR_API UComptoirPreferences : public USaveGame
{
    GENERATED_BODY()
public:
    UPROPERTY(SaveGame) float Sensitivity=1;
    UPROPERTY(SaveGame) float FieldOfView=75;
    UPROPERTY(SaveGame) float Brightness=100;
    UPROPERTY(SaveGame) bool InvertY=false;
};
