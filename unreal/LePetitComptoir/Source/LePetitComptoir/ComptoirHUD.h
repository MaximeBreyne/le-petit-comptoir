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
    void DrawTablet(const class AComptoirGameMode& Game, const class AComptoirCharacter& Player);
    int32 TabletPage = 1;
    UPROPERTY() TObjectPtr<class UTexture2D> BrandLogo;
};
