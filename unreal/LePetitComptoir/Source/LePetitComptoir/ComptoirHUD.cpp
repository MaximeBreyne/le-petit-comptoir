#include "ComptoirHUD.h"
#include "ComptoirCharacter.h"
#include "ComptoirGameMode.h"
#include "ComptoirProp.h"
#include "Engine/Canvas.h"
#include "Engine/Texture2D.h"
#include "Engine/World.h"
#include "Kismet/GameplayStatics.h"

void AComptoirHUD::DrawHUD()
{
    Super::DrawHUD();
    const AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>();
    const AComptoirCharacter* Player = Cast<AComptoirCharacter>(GetOwningPawn());
    if (!Canvas || !Game || !Player) return;
    const auto& S = Game->Simulation;
    const float Scale = FMath::Clamp(Canvas->SizeX / 1440.f, .65f, 1.2f);
    const float W = Canvas->SizeX / Scale, H = Canvas->SizeY / Scale;
    const FLinearColor Cream(.97f,.95f,.91f), Gold(.90f,.74f,.47f), Muted(.70f,.77f,.71f);
    const FLinearColor Panel(.075f,.13f,.12f,.94f), Border(.65f,.70f,.60f,.28f);
    const auto Rect = [&](float X,float Y,float Width,float Height,FLinearColor Color)
        { DrawRect(Color,X*Scale,Y*Scale,Width*Scale,Height*Scale); };
    const auto Text = [&](const FString& Value,float X,float Y,float Size,FLinearColor Color)
        { DrawText(Value,Color,X*Scale,Y*Scale,nullptr,Size*Scale); };
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
    Text(TEXT("LE PETIT COMPTOIR"),80,20,1.15f,Cream);
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
    const TCHAR* Order = S.Phase==Comptoir::Customer::Order?TEXT("Prendre la commande [E]"):
        S.Phase==Comptoir::Customer::Drink?TEXT("Une biere pression · 50 cl"):
        S.Phase==Comptoir::Customer::Drinking?TEXT("Le client deguste sa biere"):
        S.Phase==Comptoir::Customer::Walking?TEXT("Le client rejoint la caisse"):
        S.Phase==Comptoir::Customer::Processing?TEXT("Paiement par carte en cours"):
        TEXT("A encaisser a la caisse : 5 €");
    if (S.Phase!=Comptoir::Customer::None)
    {
        Card(23,169,284,83);Text(TEXT("SERVICE AU COMPTOIR"),38,183,.8f,Gold);
        Text(Order,38,211,.95f,Cream);
    }
    const FVector P=Player->GetActorLocation();
    if (!Player->IsTabletOpen() && ((P.Y>0 && P.Y<240) || S.Held!=Comptoir::Glass::None))
    {
        const float X=W-463,Y=H-276;
        Card(X,Y,440,220);Text(TEXT("DERRIERE LE COMPTOIR"),X+17,Y+15,.68f,Gold);
        Text(TEXT("Preparations en cours"),X+17,Y+36,1.4f,Cream);
        Rect(X+17,Y+68,406,1,Border);
        const TCHAR* Prep=S.Held==Comptoir::Glass::None?TEXT("Choisissez une pinte au rangement des verres."):
            S.Held==Comptoir::Glass::Empty?TEXT("Pinte vide · approchez la tireuse."):
            S.Held==Comptoir::Glass::Full?TEXT("Biere prete sur le plateau · servir avec E."):
            TEXT("Biere pression · maintenir le clic gauche pour doser.");
        Text(Prep,X+17,Y+83,.9f,Cream);
        Rect(X+17,Y+114,406,9,FLinearColor(1,1,1,.10f));
        Rect(X+17,Y+114,406*static_cast<float>(S.Amount/50),9,Gold);
        Text(FString::Printf(TEXT("%.0f / 50 cl"),S.Amount),X+17,Y+134,.95f,Gold);
        Rect(X+17,Y+164,406,1,Border);
        Text(S.Held==Comptoir::Glass::Full?TEXT("PLATEAU   Biere pression — 5 €"):TEXT("PLATEAU   Aucune boisson terminee"),X+17,Y+181,.85f,Muted);
    }
    if (!Player->IsTabletOpen())
    {
        Rect(W*.5f-1.5f,H*.5f-1.5f,3,3,Cream);
        if (const AComptoirProp* Prop=Player->FocusedProp())
        {
            const FString Prompt=Game->Prompt(Prop->Target);
            if (!Prompt.IsEmpty())
            {
                const float Width=FMath::Min(780.f,W-46);
                Card((W-Width)*.5f,H-345,Width,38);Text(Prompt,(W-Width)*.5f+15,H-333,.92f,Gold);
            }
        }
    }
    if (Player->IsTabletOpen())
    {
        Rect(0,0,W,H,FLinearColor(.025f,.06f,.05f,.65f));
        const float X=(W-620)/2,Y=FMath::Max(80.f,(H-440)/2);
        Card(X,Y,620,440);
        Text(TEXT("LE PETIT COMPTOIR"),X+28,Y+23,.8f,Gold);
        Text(TEXT("Tablette · Service"),X+28,Y+52,1.8f,Cream);
        Text(FString::Printf(TEXT("Tresorerie : %.2f €   ·   Clients encaisses : %d"),S.Cash/100.0,S.Sold),X+28,Y+102,1.f,Cream);
        Button(TEXT("service"),S.Open?TEXT("Derniere tournee"):TEXT("Ouvrir le bar"),X+28,Y+135,260,true);
        Text(FString::Printf(TEXT("Biere : %d cl au comptoir / %d cl en reserve"),S.Beer,S.Reserve),X+28,Y+198,1.f,Cream);
        Text(S.DeliveryRemaining>0?FString::Printf(TEXT("Livraison dans %.0f secondes"),S.DeliveryRemaining):TEXT("Commande : 500 cl pour 16 € · livraison sous 10 s"),X+28,Y+226,.85f,Muted);
        Button(TEXT("supply"),S.Reserve>0?TEXT("Transferer vers le comptoir"):TEXT("Commander un fut"),X+28,Y+255,260);
        Text(TEXT("Le service continue pendant la consultation de la tablette."),X+28,Y+315,.8f,Muted);
        Button(TEXT("save"),TEXT("Sauvegarder"),X+28,Y+363,170);
        Button(TEXT("tablet"),TEXT("Retour au bar [Tab]"),X+380,Y+363,210);
    }
    Text(TEXT("ZQSD / WASD  Deplacer     Souris  Regarder     E  Interagir     Tab  Tablette     P  Pause"),23,H-25,.75f,Cream);
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
    if (!Player || !Game || !Player->IsTabletOpen()) return;
    if (BoxName==TEXT("tablet") || BoxName==TEXT("tablet_header")) Player->ToggleTablet();
    else if (BoxName==TEXT("service")) Game->Interact(EComptoirTarget::Sign);
    else if (BoxName==TEXT("supply")) Game->Interact(EComptoirTarget::Stock);
    else if (BoxName==TEXT("save")) Game->Save(true);
}
