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
    void SetVenueName(const FString& Name);
    UFUNCTION(BlueprintCallable, Category="Comptoir")
    static bool PrepareWorldFont();
private:
    UPROPERTY() TObjectPtr<UProceduralMeshComponent> Geometry;
    UPROPERTY() int32 GeometryRevision = 0;
    UPROPERTY() TArray<TObjectPtr<class UTextRenderComponent>> VenueLabels;
    UPROPERTY() TArray<FVector2D> VenueLabelSizes;
};
