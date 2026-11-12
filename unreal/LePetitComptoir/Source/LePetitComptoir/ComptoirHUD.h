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
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
private:
    void UpdateTablet(const class AComptoirGameMode& Game);
    void HideTablet();
    void RemoveTablet();
    TSharedPtr<class SComptoirTablet> TabletWidget;
    TWeakObjectPtr<class UGameViewportClient> TabletViewport;
    int32 TabletPage = 1;
    UPROPERTY() TObjectPtr<class UTexture2D> BrandLogo;
};
