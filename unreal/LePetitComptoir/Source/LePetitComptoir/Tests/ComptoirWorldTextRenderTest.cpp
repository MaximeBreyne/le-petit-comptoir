#if WITH_DEV_AUTOMATION_TESTS && WITH_EDITOR
#include "../ComptoirText.h"
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
    FMaterialResource* Resource=Material->GetMaterialResource(GMaxRHIShaderPlatform);
    if(!TestNotNull(TEXT("World text material resource"),Resource))return false;
    Resource->FinishCompilation();
    for(const FString& Error:Resource->GetCompileErrors())AddError(Error);
    if(!TestTrue(TEXT("World text shaders compiled"),Resource->GetGameThreadShaderMap()!=nullptr)||HasAnyErrors())return false;
    FPreviewScene Preview{FPreviewScene::ConstructionValues()};
    constexpr int32 Width=1024,Height=256;
    TStrongObjectPtr<UTextureRenderTarget2D> Target(NewObject<UTextureRenderTarget2D>());
    Target->ClearColor=FLinearColor::Black;
    Target->InitCustomFormat(Width,Height,PF_B8G8R8A8,false);
    Target->UpdateResourceImmediate(true);
    const FString Output=FPaths::ProjectSavedDir()/TEXT("Tests/WorldText");
    IFileManager::Get().MakeDirectory(*Output,true);
    const auto CheckPixels=[&](const TCHAR* Name)
    {
        FlushRenderingCommands();TArray<FColor> Pixels;
        if(!Target->GameThread_GetRenderTargetResource()->ReadPixels(Pixels)||Pixels.Num()!=Width*Height)
        {AddError(TEXT("Cannot read text render target."));return false;}
        int32 Lit=0;
        for(const FColor& Pixel:Pixels)if(Pixel.R>80||Pixel.G>80||Pixel.B>80)++Lit;
        TestTrue(FString(Name)+TEXT(" has visible text pixels"),Lit>100);
        FFileHelper::CreateBitmap(*(Output/(FString(Name)+TEXT(".bmp"))),Width,Height,Pixels.GetData());
        return Lit>100;
    };
    // Exercise the same Canvas font route as the in-game HUD, using only € so
    // ordinary Latin letters cannot hide a missing currency glyph.
    UCanvas* Canvas=nullptr;FVector2D Size;FDrawToRenderTargetContext Context;
    UKismetRenderingLibrary::BeginDrawCanvasToRenderTarget(Preview.GetWorld(),Target.Get(),Canvas,Size,Context);
    if(Canvas){Canvas->SetDrawColor(FColor::White);Canvas->DrawText(Font,TEXT("€"),40,40,2,2);}
    UKismetRenderingLibrary::EndDrawCanvasToRenderTarget(Preview.GetWorld(),Context);
    TestNotNull(TEXT("Canvas for HUD font"),Canvas);CheckPixels(TEXT("HUD-Euro"));

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
    Capture->CaptureSource=ESceneCaptureSource::SCS_FinalColorLDR;Capture->FOVAngle=60;
    Capture->ShowFlags.SetAtmosphere(false);Capture->ShowFlags.SetFog(false);
    Capture->ShowFlags.SetMotionBlur(false);
    Capture->PostProcessSettings.bOverride_AutoExposureMethod=true;
    Capture->PostProcessSettings.AutoExposureMethod=AEM_Manual;
    Capture->PostProcessSettings.bOverride_AutoExposureApplyPhysicalCameraExposure=true;
    Capture->PostProcessSettings.AutoExposureApplyPhysicalCameraExposure=false;
    Capture->PostProcessSettings.bOverride_AutoExposureBias=true;
    Capture->PostProcessSettings.AutoExposureBias=0;
    Preview.AddComponent(Capture,FTransform(FRotator(0,180,0),FVector(250,0,0)));
    for(int Frame=0;Frame<24;++Frame)
    {Preview.GetWorld()->Tick(LEVELTICK_All,1.f/30);Capture->CaptureScene();FlushRenderingCommands();}
    CheckPixels(TEXT("World-Euro"));
    Preview.RemoveComponent(Capture);Preview.RemoveComponent(Label);
    return !HasAnyErrors();
}
#endif
