#include "ComptoirGameMode.h"
#include "ComptoirCharacter.h"
#include "ComptoirScene.h"
#include "ComptoirSave.h"
#include "Camera/CameraActor.h"
#include "Engine/World.h"
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
            const bool Home=Session.View==ComptoirSession::Screen::Home||Session.View==ComptoirSession::Screen::NewGame;
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
    else return;
    ApplyMenuState();
}

void AComptoirGameMode::MenuAction(FName Action)
{
    using ComptoirSession::Screen;
    if(!Session.MenuVisible())return;
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
    else if(Action==TEXT("menu_save")&&Session.View==Screen::Pause)Save(true);
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
