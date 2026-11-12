#include "ComptoirHUD.h"
#include "ComptoirGameMode.h"
#include "ComptoirCharacter.h"
#include "SComptoirTablet.h"
#include "Engine/GameViewportClient.h"
#include "Engine/Texture2D.h"
#include "Engine/World.h"
#include "GameFramework/GameUserSettings.h"

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
            .OnAction(FOnComptoirTabletAction::CreateUObject(this,&AComptoirHUD::NotifyHitBoxClick))
            .OnNameChanged(FOnComptoirNameChanged::CreateUObject(this,&AComptoirHUD::SetPendingBarName));
        Viewport->AddViewportWidgetContent(TabletWidget.ToSharedRef(),20);
        TabletViewport=Viewport;
    }
    const auto& S=Game.Simulation;
    State Data;
    Data.Active=static_cast<Page>(FMath::Clamp(TabletPage,0,4));
    Data.View=Game.Session.View;Data.CanContinue=Game.Session.CanContinue;Data.HasSave=Game.Session.HasSave;
    Data.SaveSummary=TCHAR_TO_UTF8(*Game.SaveSummary);Data.BarName=TCHAR_TO_UTF8(*Game.BarName);
    Data.PendingName=TCHAR_TO_UTF8(*Game.PendingBarName);Data.ValidName=Game.IsBarNameValid(Game.PendingBarName);
    for(int I=0;I<4;++I){Data.Slots[I]=TCHAR_TO_UTF8(*Game.SlotSummaries[I]);Data.ValidSlots[I]=Game.SlotValid[I];}
    Data.Confirmation=TCHAR_TO_UTF8(*Game.Confirmation);
    if(const auto* Settings=UGameUserSettings::GetGameUserSettings())
    {
        const char* Quality[]={"Faible","Moyenne","Élevée","Épique"};
        const int QualityIndex=Settings->GetOverallScalabilityLevel();
        Data.Settings[0]=QualityIndex>=0&&QualityIndex<4?Quality[QualityIndex]:"Personnalisée";
        Data.Settings[1]=Settings->GetFrameRateLimit()>0?std::to_string(static_cast<int>(Settings->GetFrameRateLimit())):"Illimitée";
        Data.Settings[2]=Settings->GetFullscreenMode()==EWindowMode::Windowed?"Fenêtré":Settings->GetFullscreenMode()==EWindowMode::Fullscreen?"Plein écran":"Plein écran fenêtré";
    }
    Data.Settings[3]=TCHAR_TO_UTF8(*FString::Printf(TEXT("%.2f"),Game.Sensitivity));
    Data.Settings[4]=std::to_string(static_cast<int>(Game.FieldOfView))+"°";
    Data.Settings[5]=std::to_string(static_cast<int>(Game.Brightness))+" %";Data.Settings[6]=Game.bInvertY?"Oui":"Non";
    Data.Developer=S.Developer;Data.ClockPaused=S.ClockPaused;
    Data.Cash=S.Cash;Data.Stock=S.Stock;Data.Reserve=S.Reserve;Data.Sold=S.Sold;Data.Day=S.Day;
    Data.Held=static_cast<int>(S.Held);Data.Vessel=static_cast<int>(S.Vessel);Data.Tray=S.Tray;
    Data.Time=S.Time;Data.Amount=S.Amount;Data.Delivery=S.Delivery;
    Data.Payment=S.PaymentSlot();Data.Processing=S.ProcessingSlot();
    Data.NearRack=Game.CanReachTabletTarget(EComptoirTarget::GlassRack);
    if(const AComptoirCharacter* Player=Cast<AComptoirCharacter>(GetOwningPawn())){Data.GlassPicker=Player->IsGlassPickerOpen();Data.ColdPicker=Player->IsColdPickerOpen();}
    Data.NearFridge=Game.CanReachTabletTarget(EComptoirTarget::Fridge);
    for(int I=0;I<Comptoir::Game::MaxCustomers;++I)
    {
        const auto& Guest=S.Guests[I];Data.Guests[I]={Guest.Id,static_cast<int>(Guest.Requested),static_cast<int>(Guest.Phase),Guest.Remaining,Game.CanReachTabletTarget(EComptoirTarget::Customer,I)};
    }
    Data.Open=S.Open;Data.Closing=S.Closing;Data.Bankrupt=S.Bankrupt();
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
