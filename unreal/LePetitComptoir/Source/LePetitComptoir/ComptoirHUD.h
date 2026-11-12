#pragma once
#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "ComptoirHUD.generated.h"

UCLASS()
class LEPETITCOMPTOIR_API AComptoirHUD : public AHUD
{
    GENERATED_BODY()
public:
    virtual void DrawHUD() override;
    virtual void NotifyHitBoxClick(FName BoxName) override;
private:
    UPROPERTY() TObjectPtr<class UTexture2D> BrandLogo;
};
