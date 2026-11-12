#include "SComptoirTablet.h"
#include "Widgets/Layout/SConstraintCanvas.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Brushes/SlateColorBrush.h"
#include "Brushes/SlateRoundedBoxBrush.h"
#include "Engine/Texture2D.h"
#include "Fonts/FontMeasure.h"
#include "Fonts/SlateFontInfo.h"
#include "Framework/Application/SlateApplication.h"
#include "Input/Events.h"
#include "Input/Reply.h"
#include "InputCoreTypes.h"
#include "Rendering/DrawElementTypes.h"
#include "Rendering/SlateRenderer.h"
#include "Styling/CoreStyle.h"

void SComptoirTablet::Construct(const FArguments& InArgs)
{
    OnAction=InArgs._OnAction;
    OnNameChanged=InArgs._OnNameChanged;
    ChildSlot
    [
        SNew(SConstraintCanvas)
        +SConstraintCanvas::Slot()
        .Offset_Lambda([this]()
        {
            const FVector2D Size=GetCachedGeometry().GetLocalSize();
            const auto L=ComptoirTablet::Build(State,Size.X>0?Size.X:1120,Size.Y>0?Size.Y:720);
            return FMargin(L.X+58*L.Scale,L.Y+369*L.Scale,454*L.Scale,46*L.Scale);
        })
        [
            SAssignNew(NameInput,SEditableTextBox)
            .Visibility_Lambda([this](){return State.View==ComptoirSession::Screen::NewGame?EVisibility::Visible:EVisibility::Collapsed;})
            .Font(FCoreStyle::GetDefaultFontStyle(TEXT("Regular"),18))
            .Padding(FMargin(12,6)).SelectAllTextWhenFocused(true).ClearKeyboardFocusOnCommit(false)
            .OnTextChanged_Lambda([this](const FText& Text){OnNameChanged.ExecuteIfBound(Text);})
            .OnTextCommitted_Lambda([this](const FText&,ETextCommit::Type Commit)
            {
                if(Commit==ETextCommit::OnEnter&&State.ValidName)OnAction.ExecuteIfBound(TEXT("menu_confirm_new"));
            })
        ]
    ];
    LogoBrush.DrawAs=ESlateBrushDrawType::Image;
    LogoBrush.ImageType=ESlateBrushImageType::FullColor;
    LogoBrush.ImageSize=FVector2f(128,128);
    SetClipping(EWidgetClipping::ClipToBounds);
    // Prices, clock and delivery progress continue to update while consulting.
    ForceVolatile(true);
}

void SComptoirTablet::SetState(const ComptoirTablet::State& InState, UTexture2D* Logo)
{
    const bool EnteringName=State.View!=InState.View&&InState.View==ComptoirSession::Screen::NewGame;
    State=InState;
    if(EnteringName&&NameInput.IsValid())
    {
        NameInput->SetText(FText::FromString(UTF8_TO_TCHAR(State.PendingName.c_str())));
        FSlateApplication::Get().SetKeyboardFocus(NameInput,EFocusCause::SetDirectly);
    }
    LogoBrush.SetResourceObject(Logo); // The HUD holds the texture via UPROPERTY.
    Invalidate(EInvalidateWidgetReason::Paint);
}

FVector2D SComptoirTablet::ComputeDesiredSize(float) const
{
    return FVector2D(1120,720);
}

int32 SComptoirTablet::OnPaint(const FPaintArgs& Args, const FGeometry& Geometry,
    const FSlateRect& CullingRect, FSlateWindowElementList& Elements, int32 LayerId,
    const FWidgetStyle& WidgetStyle, bool bParentEnabled) const
{
    using namespace ComptoirTablet;
    const FVector2D Size=Geometry.GetLocalSize();
    const Layout Device=Build(State,Size.X,Size.Y,MousePosition.X,MousePosition.Y);
    const float DpiScale=FMath::Max(.01f,Geometry.GetAccumulatedLayoutTransform().GetScale());
    const auto Measure=FSlateApplication::Get().GetRenderer()->GetFontMeasureService();
    const FLinearColor Tint=WidgetStyle.GetColorAndOpacityTint();
    static const FSlateColorBrush Solid(FLinearColor::White);
    const auto Snap=[&](FVector2D Position)
    {
        const FVector2D Absolute=Geometry.LocalToAbsolute(Position);
        return FVector2D(Geometry.AbsoluteToLocal(FVector2D(
            FMath::RoundToInt(Absolute.X),FMath::RoundToInt(Absolute.Y))));
    };
    const auto PaintAt=[&](FVector2D Position,FVector2D Extent)
    {return Geometry.ToPaintGeometry(Extent,FSlateLayoutTransform(Position));};

    FSlateDrawElement::MakeBox(Elements,LayerId,Geometry.ToPaintGeometry(),&Solid,
        ESlateDrawEffect::None,FLinearColor(.027f,.063f,.051f,State.View==ComptoirSession::Screen::Playing?.64f:.12f)*Tint);
    int32 Layer=LayerId;
    for(const Command& Item:Device.Commands)
    {
        if(Item.Type==Kind::Hit)continue;
        ++Layer; // Preserve layout painter order across boxes, lines and text.
        const FVector2D Position=Snap(FVector2D(Device.X+Item.X*Device.Scale,Device.Y+Item.Y*Device.Scale));
        const FVector2D Extent(Item.W*Device.Scale,Item.H*Device.Scale);
        FLinearColor Color=FLinearColor::FromSRGBColor(FColor(
            static_cast<uint8>(Item.Color>>16),static_cast<uint8>(Item.Color>>8),static_cast<uint8>(Item.Color)))*Tint;
        Color.A*=Item.Opacity;
        switch(Item.Type)
        {
            case Kind::Rect:
                FSlateDrawElement::MakeBox(Elements,Layer,PaintAt(Position,Extent),&Solid,ESlateDrawEffect::None,Color);
                break;
            case Kind::Rounded:
            {
                const FSlateRoundedBoxBrush Brush(FLinearColor::White,Item.Radius*Device.Scale,Extent);
                FSlateDrawElement::MakeBox(Elements,Layer,PaintAt(Position,Extent),&Brush,ESlateDrawEffect::None,Color);
                break;
            }
            case Kind::Line:
            {
                TArray<FVector2f> Points;
                Points.Add(FVector2f(Position));
                Points.Add(FVector2f(Snap(FVector2D(Device.X+Item.W*Device.Scale,Device.Y+Item.H*Device.Scale))));
                FSlateDrawElement::MakeLines(Elements,Layer,Geometry.ToPaintGeometry(),Points,
                    ESlateDrawEffect::None,Color,true,FMath::Max(1.f/DpiScale,1.5f*Device.Scale));
                break;
            }
            case Kind::Text:
            {
                if(!bDrawText)break;
                // Choose a font size, not a transform that enlarges already-rendered letters.
                // Slate includes the window DPI when rasterizing this font into its atlas.
                const float Height=FMath::Max(12.f/DpiScale,Item.Font*Device.Scale);
                FSlateFontInfo Font=FCoreStyle::GetDefaultFontStyle(
                    Item.Font>=22?TEXT("Bold"):TEXT("Regular"),Height,FFontOutlineSettings());
                const float MeasuredHeight=Measure->Measure(FString(TEXT("Ag")),Font,1.f).Y;
                Font.Size=FMath::Max(1.f,static_cast<float>(FMath::RoundToInt(Height*Font.Size/FMath::Max(1.f,MeasuredHeight))));
                FString Text=UTF8_TO_TCHAR(Item.Value.c_str());
                if(Item.W>0&&Measure->Measure(Text,Font,1.f).X>Extent.X)
                {
                    do {Text.LeftChopInline(1);}
                    while(!Text.IsEmpty()&&Measure->Measure(Text+TEXT("…"),Font,1.f).X>Extent.X);
                    Text+=TEXT("…");
                }
                const FVector2D TextSize=Measure->Measure(Text,Font,1.f);
                FSlateDrawElement::MakeText(Elements,Layer,PaintAt(Position,TextSize),Text,Font,ESlateDrawEffect::None,Color);
                break;
            }
            case Kind::Logo:
                if(LogoBrush.GetResourceObject())
                    FSlateDrawElement::MakeBox(Elements,Layer,PaintAt(Position,Extent),&LogoBrush,ESlateDrawEffect::None,Tint);
                break;
            default: break;
        }
    }
    return SCompoundWidget::OnPaint(Args,Geometry,CullingRect,Elements,Layer,WidgetStyle,bParentEnabled);
}

FReply SComptoirTablet::OnMouseButtonDown(const FGeometry& Geometry, const FPointerEvent& Event)
{
    if(Event.GetEffectingButton()!=EKeys::LeftMouseButton)return FReply::Unhandled();
    const FVector2D Size=Geometry.GetLocalSize(),Position=Geometry.AbsoluteToLocal(Event.GetScreenSpacePosition());
    const auto Layout=ComptoirTablet::Build(State,Size.X,Size.Y);
    const std::string Action=ComptoirTablet::HitTest(Layout,Position.X,Position.Y);
    if(!Action.empty())OnAction.ExecuteIfBound(FName(UTF8_TO_TCHAR(Action.c_str())));
    // Consume clicks in blank/disabled areas too, so they cannot act on the 3D bar.
    return FReply::Handled();
}

FReply SComptoirTablet::OnMouseMove(const FGeometry& Geometry, const FPointerEvent& Event)
{
    MousePosition=Geometry.AbsoluteToLocal(Event.GetScreenSpacePosition());
    Invalidate(EInvalidateWidgetReason::Paint);
    return FReply::Handled();
}

void SComptoirTablet::OnMouseLeave(const FPointerEvent& Event)
{
    MousePosition=FVector2D(-1,-1);
    Invalidate(EInvalidateWidgetReason::Paint);
    SCompoundWidget::OnMouseLeave(Event);
}
