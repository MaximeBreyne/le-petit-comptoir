#include "ComptoirHUD.h"
#include "ComptoirGameMode.h"
#include "SComptoirTablet.h"
#include "Engine/GameViewportClient.h"
#include "Engine/Texture2D.h"
#include "Engine/World.h"

void AComptoirHUD::UpdateTablet(const AComptoirGameMode& Game)
{
    using namespace ComptoirTablet;
    UGameViewportClient* Viewport=GetWorld()->GetGameViewport();
    if(!Viewport)return;
    if(TabletViewport.Get()!=Viewport)RemoveTablet();
    if(!BrandLogo)BrandLogo=LoadObject<UTexture2D>(nullptr,TEXT("/Game/Original/UI/T_ComptoirLogo.T_ComptoirLogo"));
    if(!TabletWidget.IsValid())
    {
        SAssignNew(TabletWidget,SComptoirTablet)
            .OnAction(FOnComptoirTabletAction::CreateUObject(this,&AComptoirHUD::NotifyHitBoxClick));
        Viewport->AddViewportWidgetContent(TabletWidget.ToSharedRef(),20);
        TabletViewport=Viewport;
    }
    const auto& S=Game.Simulation;
    State Data;
    Data.Active=static_cast<Page>(FMath::Clamp(TabletPage,0,3));
    Data.Cash=S.Cash;Data.Beer=S.Beer;Data.Reserve=S.Reserve;Data.Sold=S.Sold;Data.Day=S.Day;
    Data.Phase=static_cast<int>(S.Phase);Data.Held=static_cast<int>(S.Held);
    Data.Time=S.Time;Data.Amount=S.Amount;Data.Delivery=S.DeliveryRemaining;Data.Remaining=S.CustomerRemaining;
    Data.Open=S.Open;Data.Closing=S.Closing;Data.Bankrupt=S.Bankrupt();
    Data.NearCustomer=Game.CanReachTabletTarget(EComptoirTarget::Customer);
    Data.NearTill=Game.CanReachTabletTarget(EComptoirTarget::Till);
    if(Game.MessageRemaining>0)Data.Feedback=TCHAR_TO_UTF8(*Game.Message);
    TabletWidget->SetState(Data,BrandLogo);
    TabletWidget->SetVisibility(EVisibility::Visible);
}

void AComptoirHUD::HideTablet()
{
    if(TabletWidget.IsValid())TabletWidget->SetVisibility(EVisibility::Collapsed);
}

void AComptoirHUD::RemoveTablet()
{
    if(TabletWidget.IsValid())
        if(UGameViewportClient* Viewport=TabletViewport.Get())
            Viewport->RemoveViewportWidgetContent(TabletWidget.ToSharedRef());
    TabletWidget.Reset();
    TabletViewport.Reset();
}

void AComptoirHUD::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    RemoveTablet();
    Super::EndPlay(EndPlayReason);
}
