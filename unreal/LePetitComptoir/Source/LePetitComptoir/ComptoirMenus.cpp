#include "ComptoirGameMode.h"
#include "ComptoirCharacter.h"
#include "ComptoirScene.h"
#include "ComptoirSave.h"
#include "Camera/CameraActor.h"
#include "Engine/World.h"
#include "GameFramework/GameUserSettings.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Kismet/KismetSystemLibrary.h"

bool AComptoirGameMode::IsBarNameValid(const FString& Name) const
{
    const FString Trimmed=Name.TrimStartAndEnd();
    if(Trimmed.IsEmpty()||Trimmed.Len()>32)return false;
    for(TCHAR C:Trimmed)if(C<32||C==127)return false;
    return true;
}

void AComptoirGameMode::ApplyBarName()
{
    for(TActorIterator<AComptoirScene> It(GetWorld());It;++It)It->SetVenueName(BarName);
}

void AComptoirGameMode::RefreshContinue()
{
    const FString Slot=TEXT("LePetitComptoir_Unreal_Pilot_v1");
    Session.HasSave=UGameplayStatics::DoesSaveGameExist(Slot,0);
    Session.CanContinue=false;SaveSummary=TEXT("Aucune partie enregistrée.");
    if(!Session.HasSave)return;
    UComptoirSave* Data=Cast<UComptoirSave>(UGameplayStatics::LoadGameFromSlot(Slot,0));
    Comptoir::Game Snapshot;
    if(!Data||!Snapshot.Restore(TCHAR_TO_UTF8(*Data->Simulation)))
    { SaveSummary=TEXT("Sauvegarde illisible : conservée sans modification.");return; }
    Session.CanContinue=true;
    BarName=IsBarNameValid(Data->BarName)?Data->BarName.TrimStartAndEnd():TEXT("Le Petit Comptoir");
    SaveSummary=FString::Printf(TEXT("Soir %d · %.2f € · %d clients"),Snapshot.Day,Snapshot.Cash/100.0,Snapshot.Sold);
    ApplyBarName();
}

void AComptoirGameMode::ApplyMenuState()
{
    const bool Menu=Session.MenuVisible();
    if(AComptoirCharacter* Player=Cast<AComptoirCharacter>(UGameplayStatics::GetPlayerPawn(this,0)))
    {
        Player->SetMenuBlocked(Menu);
        if(APlayerController* PC=Cast<APlayerController>(Player->GetController()))
        {
            const bool Home=!Session.HasSession;
            PC->SetViewTarget(Home&&HomeCamera?static_cast<AActor*>(HomeCamera.Get()):Player);
        }
    }
    UGameplayStatics::SetGamePaused(this,Menu);
}

void AComptoirGameMode::StartNewSession()
{
    if(Session.View!=ComptoirSession::Screen::NewGame||!IsBarNameValid(PendingBarName))return;
    Simulation=Comptoir::Game();BarName=PendingBarName.TrimStartAndEnd();
    Session.Started();bReadyToSave=true;AutosaveRemaining=5;
    bDoorOpen=false;
    if(APawn* Player=UGameplayStatics::GetPlayerPawn(this,0))
    {
        Player->TeleportTo(FVector(155,600,92),FRotator::ZeroRotator,false,true);
        if(AController* Controller=Player->GetController())Controller->SetControlRotation(FRotator(-3.44,0,0));
    }
    ApplyBarName();UpdateVisuals();ApplyMenuState();
    Notify(TEXT("Bienvenue ! Tab : tablette · P : menu de pause."));
    Save();
}

void AComptoirGameMode::TogglePauseMenu()
{
    if(Session.CanSimulate())Session.Pause();
    else if(Session.View==ComptoirSession::Screen::Pause)Session.Resume();
    else if(Session.MenuVisible()){Session.View=Session.HasSession?ComptoirSession::Screen::Pause:ComptoirSession::Screen::Home;PendingSlot=-1;}
    else return;
    ApplyMenuState();
}

void AComptoirGameMode::MenuAction(FName Action)
{
    using ComptoirSession::Screen;
    if(!Session.MenuVisible())return;
    const FString Key=Action.ToString();
    if(Key.StartsWith(TEXT("setting_"))&&Session.View==Screen::Settings){SettingsAction(Action);return;}
    if(Action==TEXT("menu_load")||Action==TEXT("menu_save")||Action==TEXT("menu_settings"))
    {
        if(Session.View!=Screen::Home&&Session.View!=Screen::Pause)return;
        if(Action==TEXT("menu_save")&&!Session.HasSession)return;
        Session.Open(Action==TEXT("menu_load")?Screen::Load:Action==TEXT("menu_save")?Screen::Save:Screen::Settings);
        RefreshSlots();ApplyMenuState();return;
    }
    if(Action==TEXT("menu_back")){Session.Back();ApplyMenuState();return;}
    if(Action==TEXT("slot_cancel")&&Session.View==Screen::Confirm)
    {Session.View=bPendingLoad?Screen::Load:Screen::Save;PendingSlot=-1;ApplyMenuState();return;}
    for(int I=0;I<4;++I)if(Action==FName(*FString::Printf(TEXT("slot_%d"),I)))
    {
        if(Session.View!=Screen::Load&&Session.View!=Screen::Save)return;
        bPendingLoad=Session.View==Screen::Load;
        if((bPendingLoad&&!SlotValid[I])||(!bPendingLoad&&I==0))return;
        PendingSlot=I;
        if((bPendingLoad&&Session.HasSession)||(!bPendingLoad&&UGameplayStatics::DoesSaveGameExist(I==0?TEXT("LePetitComptoir_Unreal_Pilot_v1"):FString::Printf(TEXT("LePetitComptoir_Manual_%d"),I),0)))
        {Confirmation=bPendingLoad?TEXT("Charger cette partie ?"):TEXT("Enregistrer dans cet emplacement occupé ?");Session.View=Screen::Confirm;ApplyMenuState();return;}
        Action=TEXT("slot_confirm");break;
    }
    if(Action==TEXT("slot_confirm")&&PendingSlot>=0)
    {
        const int Slot=PendingSlot;PendingSlot=-1;
        if(bPendingLoad){if(Load(true,Slot)){Session.Started();Save();}else Session.View=Screen::Load;}
        else {Save(true,Slot);Session.View=Screen::Save;}
        RefreshSlots();ApplyMenuState();return;
    }
    if(Action==TEXT("menu_continue")&&Session.View==Screen::Home&&Session.CanContinue)
    {
        if(!Load(true)){RefreshContinue();return;}
        Session.Started();AutosaveRemaining=5;ApplyMenuState();
    }
    else if(Action==TEXT("menu_new")&&Session.View==Screen::Home)
    {PendingBarName=TEXT("Le Petit Comptoir");Message.Empty();Session.RequestNew();ApplyMenuState();}
    else if(Action==TEXT("menu_confirm_new"))StartNewSession();
    else if(Action==TEXT("menu_cancel")){Session.CancelNew();ApplyMenuState();}
    else if(Action==TEXT("menu_resume")&&Session.View==Screen::Pause){Session.Resume();ApplyMenuState();}
    else if(Action==TEXT("menu_home")&&Session.View==Screen::Pause)
    {
        if(!Save(true))return;
        Session.Home();RefreshContinue();ApplyMenuState();
    }
    else if(Action==TEXT("menu_quit")&&(Session.View==Screen::Home||Session.View==Screen::Pause))
    {
        if(Session.CanSave()&&!Save(true))return;
        UKismetSystemLibrary::QuitGame(this,UGameplayStatics::GetPlayerController(this,0),EQuitPreference::Quit,false);
    }
}

void AComptoirGameMode::DeveloperAction(FName Action)
{
    if(!Session.CanSimulate())return;
    bool Changed=false;
    if(Action==TEXT("dev_toggle")){Simulation.SetDeveloper(!Simulation.Developer);Changed=true;}
    else if(Action==TEXT("dev_money_100"))Changed=Simulation.AddTestMoney(100);
    else if(Action==TEXT("dev_money_1000"))Changed=Simulation.AddTestMoney(1000);
    else if(Action==TEXT("dev_money_10000"))Changed=Simulation.AddTestMoney(10000);
    else if(Action==TEXT("dev_progress_25"))Changed=Simulation.AddTestProgress(25);
    else if(Action==TEXT("dev_progress_100"))Changed=Simulation.AddTestProgress(100);
    else if(Action==TEXT("dev_stock"))Changed=Simulation.FillTestStocks();
    else if(Action==TEXT("dev_clock"))Changed=Simulation.ToggleTestClock();
    else if(Action==TEXT("dev_hour"))Changed=Simulation.AdvanceTestHour();
    if(!Changed){Notify(TEXT("Action indisponible : vérifiez le mode développeur et le service."));return;}
    UpdateVisuals();Notify(TEXT("Modification appliquée à cette partie."));Save();
}

void AComptoirGameMode::RefreshSlots()
{
    for(int I=0;I<4;++I)
    {
        SlotValid[I]=false;SlotSummaries[I]=TEXT("Emplacement vide");
        const FString Slot=I==0?TEXT("LePetitComptoir_Unreal_Pilot_v1"):FString::Printf(TEXT("LePetitComptoir_Manual_%d"),I);
        if(!UGameplayStatics::DoesSaveGameExist(Slot,0))continue;
        UComptoirSave* Data=Cast<UComptoirSave>(UGameplayStatics::LoadGameFromSlot(Slot,0));Comptoir::Game Snapshot;
        if(!Data||!Snapshot.Restore(TCHAR_TO_UTF8(*Data->Simulation))){SlotSummaries[I]=TEXT("Sauvegarde illisible — conservée");continue;}
        SlotValid[I]=true;SlotSummaries[I]=FString::Printf(TEXT("%s · Soir %d · %.2f € · %s"),*Data->BarName,Snapshot.Day,Snapshot.Cash/100.,*Data->SavedAt);
    }
}
void AComptoirGameMode::LoadPreferences()
{
    if(const auto* P=Cast<UComptoirPreferences>(UGameplayStatics::LoadGameFromSlot(TEXT("LePetitComptoir_Preferences"),0)))
    {
        Sensitivity=FMath::IsFinite(P->Sensitivity)?FMath::Clamp(P->Sensitivity,.25f,3.f):1;
        FieldOfView=FMath::IsFinite(P->FieldOfView)?FMath::Clamp(P->FieldOfView,60.f,100.f):75;
        Brightness=FMath::IsFinite(P->Brightness)?FMath::Clamp(P->Brightness,65.f,140.f):100;
        bInvertY=P->InvertY;
    }
}
void AComptoirGameMode::SettingsAction(FName Action)
{
    auto* Settings=UGameUserSettings::GetGameUserSettings();if(!Settings)return;
    if(Action==TEXT("setting_quality"))Settings->SetOverallScalabilityLevel((FMath::Max(0,Settings->GetOverallScalabilityLevel())+1)%4);
    else if(Action==TEXT("setting_fps")){const float F=Settings->GetFrameRateLimit();Settings->SetFrameRateLimit(F==30?60:F==60?120:30);}
    else if(Action==TEXT("setting_window"))Settings->SetFullscreenMode(Settings->GetFullscreenMode()==EWindowMode::Windowed?EWindowMode::WindowedFullscreen:EWindowMode::Windowed);
    else if(Action==TEXT("setting_sensitivity"))Sensitivity=Sensitivity>=3?.25f:Sensitivity+.25f;
    else if(Action==TEXT("setting_fov"))FieldOfView=FieldOfView>=100?60:FieldOfView+5;
    else if(Action==TEXT("setting_brightness"))Brightness=Brightness>=140?65:Brightness+5;
    else if(Action==TEXT("setting_invert"))bInvertY=!bInvertY;
    else return;
    Settings->ApplySettings(false);
    auto* P=Cast<UComptoirPreferences>(UGameplayStatics::CreateSaveGameObject(UComptoirPreferences::StaticClass()));
    if(P){P->Sensitivity=Sensitivity;P->FieldOfView=FieldOfView;P->Brightness=Brightness;P->InvertY=bInvertY;
        if(!UGameplayStatics::SaveGameToSlot(P,TEXT("LePetitComptoir_Preferences"),0))Notify(TEXT("Réglages appliqués mais leur sauvegarde a échoué."));}
}
