#include "ComptoirHUD.h"
#include "ComptoirText.h"
#include "ComptoirCharacter.h"
#include "ComptoirGameMode.h"
#include "ComptoirProp.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "Engine/Texture2D.h"
#include "Engine/World.h"
#include "Kismet/GameplayStatics.h"

void AComptoirHUD::DrawHUD()
{
    Super::DrawHUD();
    const AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>();
    const AComptoirCharacter* Player = Cast<AComptoirCharacter>(GetOwningPawn());
    if (!Canvas || !Game || !Player) { HideTablet(); return; }
    if (Game->Session.MenuVisible()||Player->IsTabletOpen()||Player->IsGlassPickerOpen()) { UpdateTablet(*Game); return; }
    HideTablet();
    const auto& S = Game->Simulation;
    const float Scale = FMath::Clamp(Canvas->SizeX / 1440.f, .65f, 1.2f);
    const float W = Canvas->SizeX / Scale, H = Canvas->SizeY / Scale;
    const FLinearColor Cream(.97f,.95f,.91f), Gold(.90f,.74f,.47f), Muted(.70f,.77f,.71f);
    const FLinearColor Panel(.075f,.13f,.12f,.94f), Border(.65f,.70f,.60f,.28f);
    if(!WorldFont)WorldFont=ComptoirText::WorldFont();
    const UFont* SmallFont=GEngine?GEngine->GetSmallFont():nullptr;
    const float ReferenceHeight=SmallFont?FMath::Max(14.f,SmallFont->GetMaxCharHeight()):14.f;
    const float FontScale=WorldFont?ReferenceHeight/FMath::Max(1.f,WorldFont->GetMaxCharHeight()):1.f;
    const auto Rect = [&](float X,float Y,float Width,float Height,FLinearColor Color)
        { DrawRect(Color,X*Scale,Y*Scale,Width*Scale,Height*Scale); };
    const auto Text = [&](const FString& Value,float X,float Y,float Size,FLinearColor Color)
        { DrawText(WorldFont?Value:Value.Replace(TEXT("€"),TEXT("EUR")),Color,X*Scale,Y*Scale,WorldFont.Get(),Size*Scale*FontScale); };
    const auto Card = [&](float X,float Y,float Width,float Height)
    {
        Rect(X,Y,Width,Height,Panel);Rect(X,Y,Width,1,Border);Rect(X,Y+Height-1,Width,1,Border);
        Rect(X,Y,1,Height,Border);Rect(X+Width-1,Y,1,Height,Border);
    };
    const auto Button = [&](const TCHAR* Name,const FString& Caption,float X,float Y,float Width,bool Primary=false)
    {
        Rect(X,Y,Width,35,Primary?Gold:FLinearColor(.13f,.22f,.19f,.95f));
        Text(Caption,X+12,Y+10,.9f,Primary?FLinearColor(.10f,.20f,.16f):Cream);
        AddHitBox(FVector2D(X,Y)*Scale,FVector2D(Width,35)*Scale,FName(Name),true);
    };
    // Match the old translucent header/footer; keep the room visible between them.
    for (int32 I=0;I<16;++I)
    {
        Rect(0,I*5,W,5,FLinearColor(.045f,.10f,.09f,.85f*(1-I/16.f)));
        Rect(0,H-40+I*2.5f,W,2.5f,FLinearColor(.045f,.10f,.09f,.8f*I/16.f));
    }
    if (!BrandLogo) BrandLogo=LoadObject<UTexture2D>(nullptr,TEXT("/Game/Original/UI/T_ComptoirLogo.T_ComptoirLogo"));
    if (BrandLogo) DrawTextureSimple(BrandLogo,23*Scale,17*Scale,44.f/128.f*Scale);
    Text(Game->BarName,80,20,1.15f,Cream);
    Text(TEXT("BAR DE QUARTIER · DEPUIS AUJOURD’HUI"),80,43,.67f,Gold);
    const int Minutes=static_cast<int>(S.Time)%1440;
    Text(FString::Printf(TEXT("Soir %d"),S.Day),W-510,30,.95f,Cream);
    Text(FString::Printf(TEXT("%02d:%02d"),Minutes/60,Minutes%60),W-425,30,.95f,Cream);
    Text(FString::Printf(TEXT("%.2f €"),S.Cash/100.0),W-330,23,1.6f,Gold);
    Button(TEXT("tablet_header"),TEXT("Tablette [Tab]"),W-200,20,170);
    Card(23,84,284,68);
    const TCHAR* Status=S.Bankrupt()?TEXT("PARTIE TERMINEE"):S.Closing?TEXT("DERNIERE TOURNEE"):S.Open?TEXT("OUVERT"):TEXT("FERME");
    Rect(38,103,6,6,S.Open?FLinearColor(.54f,.76f,.60f):Gold);
    Text(Status,52,99,.85f,Gold);
    const int Left=FMath::CeilToInt(1680-S.Time);
    Text(FString::Printf(TEXT("%d h %02d avant 4 h"),Left/60,Left%60),177,101,.75f,Cream);
    Rect(38,133,254,3,FLinearColor(1,1,1,.12f));
    Rect(38,133,254*static_cast<float>((S.Time-1020)/660),3,Gold);
    for(int I=0;I<Comptoir::Game::MaxCustomers;++I)
    {
        const auto& Guest=S.Guests[I];if(Guest.Phase==Comptoir::Customer::None)continue;
        const float Y=169+I*83.f;
        Card(23,Y,284,76);Text(FString::Printf(TEXT("CLIENT #%d"),Guest.Id),38,Y+12,.8f,Gold);
        const FString Detail=Guest.Phase==Comptoir::Customer::Order?TEXT("Prendre la commande [E]"):
            Guest.Phase==Comptoir::Customer::Drink?UTF8_TO_TCHAR(Comptoir::Drink(Guest.Requested).Name):
            Guest.Phase==Comptoir::Customer::Drinking?TEXT("Dégustation"):
            Guest.Phase==Comptoir::Customer::Processing?TEXT("Paiement en cours"):TEXT("Rejoint / attend la caisse");
        Text(Detail,38,Y+40,.95f,Cream);
    }
    const FVector P=Player->GetActorLocation();
    if (!Player->IsTabletOpen() && ((P.X>0 && P.X<240) || S.Held!=Comptoir::Glass::None))
    {
        const float X=W-463,Y=H-276;
        Card(X,Y,440,220);Text(TEXT("DERRIERE LE COMPTOIR"),X+17,Y+15,.68f,Gold);
        Text(TEXT("Preparations en cours"),X+17,Y+36,1.4f,Cream);
        Rect(X+17,Y+68,406,1,Border);
        const auto& Recipe=Comptoir::Drink(S.Vessel);
        const FString Prep=S.Held==Comptoir::Glass::None?TEXT("E sur VERRERIE pour choisir un contenant."):
            FString::Printf(TEXT("%s · %s"),UTF8_TO_TCHAR(Recipe.Vessel),UTF8_TO_TCHAR(Recipe.Station));
        Text(Prep,X+17,Y+83,.9f,Cream);
        Rect(X+17,Y+114,406,9,FLinearColor(1,1,1,.10f));
        Rect(X+17,Y+114,406*static_cast<float>(S.Amount/Recipe.Target),9,Gold);
        Text(FString::Printf(TEXT("%.0f / %.0f %s"),S.Amount,Recipe.Target,UTF8_TO_TCHAR(Recipe.Unit)),X+17,Y+134,.95f,Gold);
        Rect(X+17,Y+164,406,1,Border);
        Text(FString::Printf(TEXT("PLATEAU %d/4 · %d bière(s), %d vin(s), %d café(s)"),S.TrayCount(),S.ReadyCount(Comptoir::Recipe::Beer),S.ReadyCount(Comptoir::Recipe::Wine),S.ReadyCount(Comptoir::Recipe::Coffee)),X+17,Y+181,.8f,Muted);
    }
    if (!Player->IsTabletOpen())
    {
        Rect(W*.5f-1.5f,H*.5f-1.5f,3,3,Cream);
        if (const AComptoirProp* Prop=Player->FocusedProp())
        {
            const FString Prompt=Game->Prompt(Prop->Target,Prop->CustomerSlot);
            if (!Prompt.IsEmpty())
            {
                const float Width=FMath::Min(780.f,W-46);
                Card((W-Width)*.5f,H-345,Width,38);Text(Prompt,(W-Width)*.5f+15,H-333,.92f,Gold);
            }
        }
    }
    Text(TEXT("ZQSD / WASD  Deplacer     Souris  Regarder     E  Interagir     Tab  Tablette     P  Pause"),23,H-25,.75f,Cream);
    if (Player->IsInReserve())
        Text(TEXT("RESERVE : E ou Tab pour ouvrir la gestion des stocks"),23,H-118,1.f,Gold);
    Text(TEXT("Sauvegarde automatique · 17 h — 4 h · Frais : 35 € / soir"),W-425,H-25,.7f,Muted);
    if (Game->MessageRemaining>0)
    {
        const float Width=FMath::Min(800.f,W-46);Card((W-Width)/2,H-86,Width,36);
        Text(Game->Message,(W-Width)/2+15,H-74,.85f,Gold);
    }
    if (UGameplayStatics::IsGamePaused(this))
    {
        Card(W/2-180,H/2-48,360,96);
        Text(TEXT("PAUSE"),W/2-45,H/2-28,1.6f,Gold);
        Text(TEXT("Appuyez sur P pour reprendre"),W/2-110,H/2+12,.95f,Cream);
    }
}

void AComptoirHUD::NotifyHitBoxClick(FName BoxName)
{
    Super::NotifyHitBoxClick(BoxName);
    AComptoirCharacter* Player=Cast<AComptoirCharacter>(GetOwningPawn());
    AComptoirGameMode* Game=GetWorld()->GetAuthGameMode<AComptoirGameMode>();
    if(!Player||!Game)return;
    if(Game->Session.MenuVisible()){Game->MenuAction(BoxName);return;}
    if(Player->IsGlassPickerOpen())
    {
        if(BoxName==TEXT("glass_close")){Player->SetGlassPicker(false);HideTablet();return;}
        for(int I=0;I<Comptoir::DrinkCount;++I)if(BoxName==FName(*FString::Printf(TEXT("glass_%d"),I)))Game->ChooseGlass(I);
        if(!Player->IsGlassPickerOpen())HideTablet();
        return;
    }
    if(!Player->IsTabletOpen())return;
    if(BoxName.ToString().StartsWith(TEXT("dev_"))){Game->DeveloperAction(BoxName);return;}
    for(int I=0;I<Comptoir::Game::MaxCustomers;++I)
        if(BoxName==FName(*FString::Printf(TEXT("customer_%d"),I)))
        {if(Game->CanReachTabletTarget(EComptoirTarget::Customer,I))Game->Interact(EComptoirTarget::Customer,I);return;}
    for(int I=0;I<Comptoir::DrinkCount;++I)
        if(BoxName==FName(*FString::Printf(TEXT("supply_%d"),I)))
        {if(Game->Simulation.Supply(static_cast<Comptoir::Recipe>(I))){Game->Notify(TEXT("Stock mis à jour."));Game->Save();}return;}
    for(int I=0;I<Comptoir::Game::TrayCapacity;++I)
        if(BoxName==FName(*FString::Printf(TEXT("tray_discard_%d"),I)))
        {if(Game->Simulation.DiscardTray(I)){Game->Notify(TEXT("Boisson retirée du plateau, sans remboursement."));Game->Save();}return;}
    if(BoxName==TEXT("tablet")||BoxName==TEXT("tablet_header")||BoxName==TEXT("return_bar"))Player->ToggleTablet();
    else if(BoxName==TEXT("service"))Game->Interact(EComptoirTarget::Sign);
    else if(BoxName==TEXT("pay_card")&&Game->CanReachTabletTarget(EComptoirTarget::Till))Game->Interact(EComptoirTarget::Till);
    else if (BoxName==TEXT("tab_service")) TabletPage=0;
    else if (BoxName==TEXT("tab_orders")) TabletPage=1;
    else if (BoxName==TEXT("tab_register")) TabletPage=2;
    else if (BoxName==TEXT("tab_reserve")) TabletPage=3;
    else if(BoxName==TEXT("tab_developer"))TabletPage=4;
    else if (BoxName==TEXT("save")) Game->Save(true);
    if (!Player->IsTabletOpen()) HideTablet();
}

void AComptoirHUD::SetPendingBarName(const FText& Name)
{
    if(AComptoirGameMode* Game=GetWorld()->GetAuthGameMode<AComptoirGameMode>())
        if(Game->Session.View==ComptoirSession::Screen::NewGame)Game->PendingBarName=Name.ToString();
}
