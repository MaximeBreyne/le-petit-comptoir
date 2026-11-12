#pragma once
#include "CoreMinimal.h"
#include "Engine/Font.h"
#include "Engine/Texture2D.h"
#include "Components/TextRenderComponent.h"
#include "Materials/MaterialInterface.h"

namespace ComptoirText
{
inline bool IsUsable(const UFont* Font)
{
    if(!Font||Font->FontCacheType!=EFontCacheType::Offline||Font->GetMaxCharHeight()<=0||
       Font->Textures.Num()!=1||!Font->Textures[0])return false;
    for(const TCHAR C:FString(TEXT("Ag09€éèàç")))
    {
        const int32 I=Font->RemapChar(C);
        if(I==UFont::NULLCHARACTER||!Font->Characters.IsValidIndex(I))return false;
        const FFontCharacter& G=Font->Characters[I];
        if(G.USize<=0||G.VSize<=0||G.TextureIndex!=0)return false;
    }
    return true;
}
inline UFont* WorldFont()
{
    UFont* Font=LoadObject<UFont>(nullptr,TEXT("/Game/Original/Fonts/F_ComptoirWorld.F_ComptoirWorld"));
    return IsUsable(Font)?Font:nullptr;
}
inline void Configure(UTextRenderComponent* Label,const FString& Caption)
{
    UFont* Font=WorldFont();
    UMaterialInterface* Material=LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/Original/Materials/M_ComptoirText.M_ComptoirText"));
    const UTextRenderComponent* Defaults=GetDefault<UTextRenderComponent>();
    const bool Custom=Font&&Material;
    Label->SetFont(Custom?Font:Defaults->Font.Get());
    Label->SetTextMaterial(Custom?Material:Defaults->TextMaterial.Get());
    // An invalid generated atlas must never make every label disappear.
    Label->SetText(FText::FromString(Custom?Caption:Caption.Replace(TEXT("€"),TEXT("EUR"))));
}
inline void FitToPanel(UTextRenderComponent* Label,double Width,double Height)
{
    Label->SetWorldSize(Height);
    const FVector Extent=Label->GetTextLocalSize(); // Text lies in the local Y/Z plane.
    const double Scale=FMath::Min(1.0,FMath::Min(Width/FMath::Max(1.0,Extent.Y),Height/FMath::Max(1.0,Extent.Z)));
    Label->SetWorldSize(Height*Scale);
}
}
