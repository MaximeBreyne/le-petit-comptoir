#include "ComptoirHUD.h"
#include "ComptoirCharacter.h"
#include "ComptoirGameMode.h"
#include "ComptoirProp.h"
#include "Engine/Canvas.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

void AComptoirHUD::DrawHUD()
{
    Super::DrawHUD();
    const AComptoirGameMode* Game = GetWorld()->GetAuthGameMode<AComptoirGameMode>();
    if (!Canvas || !Game) return;
    const auto& S = Game->Simulation;
    const float W = Canvas->SizeX, H = Canvas->SizeY;
    const FLinearColor Cream(.94f, .90f, .78f), Gold(.94f, .70f, .30f);
    const int Minutes = static_cast<int>(S.Time) % 1440;
    const TCHAR* State = S.Bankrupt() ? TEXT("PARTIE TERMINEE") : S.Closing ? TEXT("DERNIERE TOURNEE") : S.Open ? TEXT("OUVERT") : TEXT("FERME");
    DrawRect(FLinearColor(.02f, .04f, .03f, .92f), 0, 0, W, 130);
    DrawText(TEXT("LE PETIT COMPTOIR   /   UNREAL - PILOTE"), Gold, 24, 16, nullptr, 1.35f);
    DrawText(FString::Printf(TEXT("Soir %d   |   %02d:%02d   |   %s   |   %.2f EUR   |   Clients encaisses : %d"),
        S.Day, Minutes / 60, Minutes % 60, State, S.Cash / 100.0, S.Sold), Cream, 24, 48);
    DrawText(FString::Printf(TEXT("Biere : %d cl au comptoir / %d cl en reserve   |   Livraison : %.0f s"), S.Beer, S.Reserve, S.DeliveryRemaining), Cream, 24, 74);
    const TCHAR* Hand = S.Held == Comptoir::Glass::None ? TEXT("Mains libres") : S.Held == Comptoir::Glass::Empty ? TEXT("Pinte vide") : S.Held == Comptoir::Glass::Full ? TEXT("Biere sur le plateau") : TEXT("Biere en preparation");
    DrawText(FString::Printf(TEXT("%s   |   Dosage : %.0f / 50 cl"), Hand, S.Amount), Gold, 24, 100);
    DrawRect(FLinearColor::White, W * .5f - 2, H * .5f - 2, 4, 4);
    if (const AComptoirCharacter* Player = Cast<AComptoirCharacter>(GetOwningPawn()))
        if (const AComptoirProp* Prop = Player->FocusedProp())
        {
            DrawRect(FLinearColor(0, 0, 0, .8f), 12, H - 150, W - 24, 38);
            DrawText(Game->Prompt(Prop->Target), Gold, 24, H - 140);
        }
    if (Game->MessageRemaining > 0) DrawText(Game->Message, Cream, 24, H - 95);
    DrawText(TEXT("ZQSD / WASD : marcher   Souris : regarder   Maj : courir   E : agir   P : pause"), Cream, 24, H - 60);
    DrawText(TEXT("Clic gauche maintenu : tirer la biere   F5 : sauver   F9 : charger   R sur tireuse : jeter"), Cream, 24, H - 36);
    if (UGameplayStatics::IsGamePaused(this)) DrawText(TEXT("PAUSE - P pour reprendre"), Gold, W * .5f - 140, H * .5f + 35, nullptr, 1.5f);
}
