#if WITH_DEV_AUTOMATION_TESTS && WITH_EDITOR
#include "../ComptoirText.h"
#include "ComptoirRenderTest.h"
#include "Components/SceneCaptureComponent2D.h"
#include "Engine/Canvas.h"
#include "Engine/TextureRenderTarget2D.h"
#include "Engine/World.h"
#include "Materials/Material.h"
#include "MaterialShared.h"
#include "Kismet/KismetRenderingLibrary.h"
#include "Misc/App.h"
#include "Misc/AutomationTest.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "HAL/FileManager.h"
#include "PreviewScene.h"
#include "RenderingThread.h"
#include "RHIShaderPlatform.h"
#include "TextureResource.h"
#include "UObject/StrongObjectPtr.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FComptoirWorldTextRenderTest,"LePetitComptoir.World.RenderedText",
    EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)

bool FComptoirWorldTextRenderTest::RunTest(const FString&)
{
    if(!FApp::CanEverRender()){AddError(TEXT("Text rendering requires a GPU; remove -NullRHI."));return false;}
    UFont* Font=ComptoirText::WorldFont();
    if(!TestNotNull(TEXT("Usable generated offline font"),Font))return false;
    UMaterial* Material=LoadObject<UMaterial>(nullptr,TEXT("/Game/Original/Materials/M_ComptoirText.M_ComptoirText"));
    if(!TestNotNull(TEXT("World text material"),Material))return false;
    FPreviewScene Preview{FPreviewScene::ConstructionValues()};
    constexpr int32 Width=1024,Height=256;
    TStrongObjectPtr<UTextureRenderTarget2D> Target(NewObject<UTextureRenderTarget2D>());
    Target->ClearColor=FLinearColor::Black;
    Target->InitCustomFormat(Width,Height,PF_B8G8R8A8,false);
    Target->UpdateResourceImmediate(true);
    const FString Output=FPaths::ProjectSavedDir()/TEXT("Tests/WorldText");
    IFileManager::Get().MakeDirectory(*Output,true);
    const auto ReadVisiblePixels=[&](const TCHAR* Name)
    {
        FlushRenderingCommands();TArray<FColor> Pixels;
        if(!Target->GameThread_GetRenderTargetResource()->ReadPixels(Pixels)||Pixels.Num()!=Width*Height)
        {AddError(TEXT("Cannot read text render target."));return -1;}
        int32 Lit=0,Peak=0;
        for(const FColor& Pixel:Pixels)
        {
            const int32 Brightness=FMath::Max3(int32(Pixel.R),int32(Pixel.G),int32(Pixel.B));
            if(Brightness>80)++Lit;Peak=FMath::Max(Peak,Brightness);
        }
        AddInfo(FString::Printf(TEXT("%s: visible pixels=%d, peak channel=%d"),Name,Lit,Peak));
        TestTrue(TEXT("Save text capture"),FFileHelper::CreateBitmap(*(Output/(FString(Name)+TEXT(".bmp"))),Width,Height,Pixels.GetData()));
        return Lit;
    };
    // Exercise the same Canvas font route as the in-game HUD, using only € so
    // ordinary Latin letters cannot hide a missing currency glyph.
    UCanvas* Canvas=nullptr;FVector2D Size;FDrawToRenderTargetContext Context;
    UKismetRenderingLibrary::BeginDrawCanvasToRenderTarget(Preview.GetWorld(),Target.Get(),Canvas,Size,Context);
    if(Canvas){Canvas->SetDrawColor(FColor::White);Canvas->DrawText(Font,TEXT("€"),40,40,2,2);}
    UKismetRenderingLibrary::EndDrawCanvasToRenderTarget(Preview.GetWorld(),Context);
    TestNotNull(TEXT("Canvas for HUD font"),Canvas);
    TestTrue(TEXT("HUD-Euro has visible text pixels"),ReadVisiblePixels(TEXT("HUD-Euro"))>100);

    UTextRenderComponent* Label=NewObject<UTextRenderComponent>();
    ComptoirText::Configure(Label,FString::ChrN(32,TCHAR('W')));
    ComptoirText::FitToPanel(Label,1080,44);
    const FVector NameSize=Label->GetTextLocalSize();
    TestTrue(TEXT("Wide 32-character name fits the frontage"),NameSize.Y>0&&NameSize.Y<=1080.1&&NameSize.Z<=44.1);
    ComptoirText::Configure(Label,TEXT("€"));
    Label->SetWorldSize(45);Label->SetTextRenderColor(FColor::White);
    Label->SetHorizontalAlignment(EHTA_Center);Label->SetVerticalAlignment(EVRTA_TextCenter);
    Preview.AddComponent(Label,FTransform::Identity);
    USceneCaptureComponent2D* Capture=NewObject<USceneCaptureComponent2D>();
    Capture->TextureTarget=Target.Get();Capture->bCaptureEveryFrame=false;Capture->bCaptureOnMovement=false;
    Capture->bAlwaysPersistRenderingState=true;
    Capture->PostProcessBlendWeight=1;
    Capture->CaptureSource=ESceneCaptureSource::SCS_FinalColorLDR;Capture->FOVAngle=60;
    Capture->ShowFlags.SetAtmosphere(false);Capture->ShowFlags.SetFog(false);
    Capture->ShowFlags.SetMotionBlur(false);
    Capture->ShowFlags.SetTextRender(true);
    Capture->PostProcessSettings.bOverride_AutoExposureMethod=true;
    Capture->PostProcessSettings.AutoExposureMethod=AEM_Manual;
    Capture->PostProcessSettings.bOverride_AutoExposureApplyPhysicalCameraExposure=true;
    Capture->PostProcessSettings.AutoExposureApplyPhysicalCameraExposure=false;
    Capture->PostProcessSettings.bOverride_AutoExposureBias=true;
    Capture->PostProcessSettings.AutoExposureBias=0;
    Preview.AddComponent(Capture,FTransform(FRotator(0,180,0),FVector(250,0,0)));
    ComptoirRenderTest::PrepareScene(Preview,{Material});
    if(ComptoirRenderTest::CheckMaterial(*this,Material))
    {
        TestTrue(TEXT("Label uses the generated font and matching material"),Label->Font.Get()==Font&&Label->GetMaterial(0)==Material);
        AddInfo(FString::Printf(TEXT("World text: font=%s, material=%s, local size=%s"),
            *Font->GetPathName(),*Material->GetPathName(),*Label->GetTextLocalSize().ToString()));
        // Prove that SceneCapture replaces the earlier Canvas image: the hidden
        // label must not leave behind the HUD euro or a previous capture.
        Label->SetVisibility(false);
        ComptoirRenderTest::Capture(Preview,Capture);
        const int32 Empty=ReadVisiblePixels(TEXT("World-Empty"));
        TestTrue(TEXT("Hidden text leaves a black capture"),Empty>=0&&Empty<100);
        Label->SetVisibility(true);
        ComptoirRenderTest::Capture(Preview,Capture);
        if(!TestTrue(TEXT("World-Euro has visible text pixels"),ReadVisiblePixels(TEXT("World-Euro"))>100))
        {
            // Keep the required front-facing test failed. These images locate
            // culling/orientation vs custom-font/material problems on the GPU.
            Capture->SetWorldLocation(FVector(-250,0,0));Capture->SetWorldRotation(FRotator::ZeroRotator);
            ComptoirRenderTest::Capture(Preview,Capture);ReadVisiblePixels(TEXT("World-Euro-Reverse"));
            Capture->SetWorldLocation(FVector(250,0,0));Capture->SetWorldRotation(FRotator(0,180,0));
            const UTextRenderComponent* Defaults=GetDefault<UTextRenderComponent>();
            Label->SetFont(Defaults->Font.Get());Label->SetTextMaterial(Defaults->TextMaterial.Get());
            Label->SetText(FText::FromString(TEXT("A")));
            ComptoirRenderTest::PrepareScene(Preview,{Defaults->TextMaterial->GetMaterial()});
            ComptoirRenderTest::Capture(Preview,Capture);
            TestTrue(TEXT("Engine default font control is visible"),ReadVisiblePixels(TEXT("World-DefaultFont"))>100);
        }
    }
    Preview.RemoveComponent(Capture);Preview.RemoveComponent(Label);
    return !HasAnyErrors();
}
#endif
