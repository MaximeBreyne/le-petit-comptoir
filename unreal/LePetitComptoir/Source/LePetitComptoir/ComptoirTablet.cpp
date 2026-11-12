#include "ComptoirHUD.h"
#include "ComptoirCharacter.h"
#include "ComptoirGameMode.h"
#include "TabletLayout.h"
#include "Engine/Canvas.h"
#include "Engine/Texture2D.h"
#include "GameFramework/PlayerController.h"
#include "CanvasItem.h"
#include "Framework/Application/SlateApplication.h"
#include "Fonts/FontMeasure.h"
#include "Fonts/SlateFontInfo.h"
#include "Rendering/SlateRenderer.h"
#include "Styling/CoreStyle.h"

void AComptoirHUD::DrawTablet(const AComptoirGameMode& Game, const AComptoirCharacter& Player)
{
    using namespace ComptoirTablet;
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
    float MouseX=-1,MouseY=-1;
    if(const APlayerController* Controller=Cast<APlayerController>(Player.GetController()))
        Controller->GetMousePosition(MouseX,MouseY);
    const Layout Device=Build(Data,Canvas->SizeX,Canvas->SizeY,MouseX,MouseY);
    const auto FontMeasure=FSlateApplication::Get().GetRenderer()->GetFontMeasureService();
    DrawRect(FLinearColor(.027f,.063f,.051f,.64f),0,0,Canvas->SizeX,Canvas->SizeY);
    if(!BrandLogo)BrandLogo=LoadObject<UTexture2D>(nullptr,TEXT("/Game/Original/UI/T_ComptoirLogo.T_ComptoirLogo"));
    for(const Command& Item:Device.Commands)
    {
        const float X=Device.X+Item.X*Device.Scale,Y=Device.Y+Item.Y*Device.Scale;
        const float W=Item.W*Device.Scale,H=Item.H*Device.Scale;
        const FLinearColor Color=FLinearColor::FromSRGBColor(FColor(
            static_cast<uint8>(Item.Color>>16),static_cast<uint8>(Item.Color>>8),static_cast<uint8>(Item.Color)));
        switch(Item.Type)
        {
            case Kind::Rect: DrawRect(Color,X,Y,W,H);break;
            case Kind::Rounded:
            {
                // Horizontal strips keep rounded corners independent of UI textures.
                const float R=FMath::Min(Item.Radius*Device.Scale,FMath::Min(W,H)*.5f);
                DrawRect(Color,X,Y+R,W,FMath::Max(0.f,H-2*R));
                for(float Row=0;Row<R;Row+=1.f)
                {
                    const float Step=FMath::Min(1.f,R-Row),D=R-Row-Step*.5f;
                    const float Inset=R-FMath::Sqrt(FMath::Max(0.f,R*R-D*D));
                    DrawRect(Color,X+Inset,Y+Row,W-2*Inset,Step);
                    DrawRect(Color,X+Inset,Y+H-Row-Step,W-2*Inset,Step);
                }
                break;
            }
            case Kind::Text:
            {
                FString Value=UTF8_TO_TCHAR(Item.Value.c_str());
                // Rasterize a scalable Slate font at the final pixel size. Scaling
                // the default Canvas bitmap font blurred both headings and small labels.
                const int32 PixelHeight=FMath::Max(12,FMath::RoundToInt(Item.Font*Device.Scale));
                FSlateFontInfo Font=FCoreStyle::GetDefaultFontStyle(
                    Item.Font>=22?TEXT("Bold"):TEXT("Regular"),PixelHeight,FFontOutlineSettings());
                const float LineHeight=FontMeasure->Measure(FText::FromString(TEXT("Ag")),Font,1.f).Y;
                Font.Size=FMath::Max(1,FMath::RoundToInt(PixelHeight*Font.Size/FMath::Max(1.f,LineHeight)));
                if(Item.W>0)
                {
                    // Keep the chosen text size; shorten only an unusually long value.
                    if(FontMeasure->Measure(FText::FromString(Value),Font,1.f).X>W)
                    {
                        while(!Value.IsEmpty()&&FontMeasure->Measure(FText::FromString(Value+TEXT("…")),Font,1.f).X>W)
                            Value.LeftChopInline(1);
                        Value+=TEXT("…");
                    }
                }
                FCanvasTextItem Label(FVector2D(FMath::RoundToInt(X),FMath::RoundToInt(Y)),FText::FromString(Value),Font,Color);
                Canvas->DrawItem(Label);
                break;
            }
            case Kind::Line: DrawLine(X,Y,Device.X+W,Device.Y+H,Color,1.5f*Device.Scale);break;
            case Kind::Logo:
                if(BrandLogo)DrawTextureSimple(BrandLogo,X,Y,W/128.f);
                break;
            case Kind::Hit:
                AddHitBox(FVector2D(X,Y),FVector2D(W,H),FName(UTF8_TO_TCHAR(Item.Value.c_str())),true,10);
                break;
        }
    }
}
