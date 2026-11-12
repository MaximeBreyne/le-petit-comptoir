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
    void SelectTabletPage(int32 Page) { TabletPage=FMath::Clamp(Page,0,4); }
private:
    UPROPERTY() TObjectPtr<class UFont> WorldFont;
    void UpdateTablet(const class AComptoirGameMode& Game);
    void HideTablet();
    void SetPendingBarName(const FText& Name);
    void RemoveTablet();
    TSharedPtr<class SComptoirTablet> TabletWidget;
    TWeakObjectPtr<class UGameViewportClient> TabletViewport;
    int32 TabletPage = 1;
    UPROPERTY() TObjectPtr<class UTexture2D> BrandLogo;
};
