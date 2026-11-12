#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ComptoirScene.generated.h"

class UProceduralMeshComponent;

// Original JavaScript scene exported as data, rendered natively by Unreal.
UCLASS()
class LEPETITCOMPTOIR_API AComptoirScene : public AActor
{
    GENERATED_BODY()
public:
    AComptoirScene();
    UFUNCTION(BlueprintCallable, Category="Comptoir")
    bool Build(const FString& Collection, bool bWithCollision=false);
    UFUNCTION(BlueprintPure, Category="Comptoir")
    int32 GetGeometryRevision() const { return GeometryRevision; }
    void SetAmbientModel();
private:
    UPROPERTY() TObjectPtr<UProceduralMeshComponent> Geometry;
    UPROPERTY() int32 GeometryRevision = 0;
};
