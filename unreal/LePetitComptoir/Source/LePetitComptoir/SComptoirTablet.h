#pragma once

#include "CoreMinimal.h"
#include "TabletLayout.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/DeclarativeSyntaxSupport.h"
#include "Styling/SlateBrush.h"

DECLARE_DELEGATE_OneParam(FOnComptoirTabletAction, FName);
DECLARE_DELEGATE_OneParam(FOnComptoirNameChanged, const FText&);

// A screen-space Slate widget. Text is rasterized by Slate at the viewport DPI;
// it never passes through the HUD bitmap font, a ScaleBox or a render texture.
class SComptoirTablet final : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SComptoirTablet) {}
        SLATE_EVENT(FOnComptoirTabletAction, OnAction)
        SLATE_EVENT(FOnComptoirNameChanged, OnNameChanged)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);
    void SetState(const ComptoirTablet::State& InState, class UTexture2D* Logo);

    virtual FVector2D ComputeDesiredSize(float LayoutScaleMultiplier) const override;
    virtual int32 OnPaint(const FPaintArgs& Args, const FGeometry& AllottedGeometry,
        const FSlateRect& MyCullingRect, FSlateWindowElementList& OutDrawElements,
        int32 LayerId, const FWidgetStyle& InWidgetStyle, bool bParentEnabled) const override;
    virtual FReply OnMouseButtonDown(const FGeometry& Geometry, const FPointerEvent& Event) override;
    virtual FReply OnMouseMove(const FGeometry& Geometry, const FPointerEvent& Event) override;
    virtual void OnMouseLeave(const FPointerEvent& Event) override;
    virtual bool SupportsKeyboardFocus() const override { return false; }

#if WITH_DEV_AUTOMATION_TESTS
    // The render regression test compares real Slate pixels with/without text.
    void SetTextVisibleForTest(bool bVisible) { bDrawText=bVisible; Invalidate(EInvalidateWidgetReason::Paint); }
#endif
private:
    ComptoirTablet::State State;
    FOnComptoirTabletAction OnAction;
    FOnComptoirNameChanged OnNameChanged;
    TSharedPtr<class SEditableTextBox> NameInput;
    FSlateBrush LogoBrush;
    FVector2D MousePosition=FVector2D(-1,-1);
    bool bDrawText=true;
};
