#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ComptoirProp.generated.h"

class UStaticMeshComponent;
class UTextRenderComponent;

UENUM()
enum class EComptoirTarget : uint8 { None, Sign, GlassRack, Tap, Customer, Till, Stock, Door, Wine, Coffee };

UCLASS()
class LEPETITCOMPTOIR_API AComptoirProp : public AActor
{
    GENERATED_BODY()
public:
    AComptoirProp();
    UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Mesh;
    UPROPERTY(VisibleAnywhere) TObjectPtr<UTextRenderComponent> Label;
    EComptoirTarget Target = EComptoirTarget::None;
    int32 CustomerSlot=-1;
    void Configure(const FVector& Size, const FLinearColor& Color, EComptoirTarget InTarget, const FString& Caption);
};
