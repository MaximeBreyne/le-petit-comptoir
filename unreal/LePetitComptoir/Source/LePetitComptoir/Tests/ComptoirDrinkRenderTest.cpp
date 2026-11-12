#if WITH_DEV_AUTOMATION_TESTS && WITH_EDITOR
#include "../ComptoirScene.h"
#include "Components/SceneCaptureComponent2D.h"
#include "Engine/TextureRenderTarget2D.h"
#include "Engine/World.h"
#include "Materials/Material.h"
#include "MaterialShared.h"
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

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FComptoirDrinkRenderTest,"LePetitComptoir.Drinks.GoldenBeer",
    EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)

bool FComptoirDrinkRenderTest::RunTest(const FString&)
{
    if(!FApp::CanEverRender()){AddError(TEXT("Beer rendering requires a GPU, without -NullRHI."));return false;}
    // This test runs before MaterialsAndViews. Do not capture temporary fallback
    // shaders while the real glass/liquid materials are still compiling.
    for(int32 Index:{11,16})
    {
        const FString Path=FString::Printf(TEXT("/Game/Original/Materials/M_Original_%02d.M_Original_%02d"),Index,Index);
        UMaterial* Material=LoadObject<UMaterial>(nullptr,*Path);
        if(!TestNotNull(Path,Material))return false;
        FMaterialResource* Resource=Material->GetMaterialResource(GMaxRHIShaderPlatform);
        if(!TestNotNull(TEXT("Drink material resource"),Resource))return false;
        Resource->FinishCompilation();
        for(const FString& Error:Resource->GetCompileErrors())AddError(Path+TEXT(": ")+Error);
        TestTrue(Path+TEXT(" has compiled shaders"),Resource->GetGameThreadShaderMap()!=nullptr);
    }
    if(HasAnyErrors())return false;
    FPreviewScene Preview{FPreviewScene::ConstructionValues()};
    constexpr int32 Width=512,Height=512;
    TStrongObjectPtr<UTextureRenderTarget2D> Target(NewObject<UTextureRenderTarget2D>());
    Target->ClearColor=FLinearColor::Black;Target->InitCustomFormat(Width,Height,PF_B8G8R8A8,false);
    Target->UpdateResourceImmediate(true);
    AComptoirScene* Glass=Preview.GetWorld()->SpawnActor<AComptoirScene>();
    if(!TestNotNull(TEXT("Drink actor"),Glass))return false;
    Glass->SetAmbientModel();
    USceneCaptureComponent2D* Capture=NewObject<USceneCaptureComponent2D>();
    Capture->TextureTarget=Target.Get();Capture->bCaptureEveryFrame=false;Capture->bCaptureOnMovement=false;
    Capture->bAlwaysPersistRenderingState=true;Capture->PostProcessBlendWeight=1;
    Capture->CaptureSource=ESceneCaptureSource::SCS_FinalColorLDR;Capture->FOVAngle=40;
    Capture->ShowFlags.SetAtmosphere(false);Capture->ShowFlags.SetFog(false);Capture->ShowFlags.SetMotionBlur(false);
    // A controlled exposure lets the test distinguish gold from black, even in a dark bar.
    // Match the venue's fixed exposure. Min/max brightness alone is ambiguous
    // when the project uses an extended EV100 range or physical camera exposure.
    Capture->PostProcessSettings.bOverride_AutoExposureMethod=true;
    Capture->PostProcessSettings.AutoExposureMethod=AEM_Manual;
    Capture->PostProcessSettings.bOverride_AutoExposureApplyPhysicalCameraExposure=true;
    Capture->PostProcessSettings.AutoExposureApplyPhysicalCameraExposure=false;
    Capture->PostProcessSettings.bOverride_AutoExposureBias=true;
    Capture->PostProcessSettings.AutoExposureBias=0;
    Preview.AddComponent(Capture,FTransform(FRotator(-20,180,0),FVector(65,0,39)));
    const FString Output=FPaths::ProjectSavedDir()/TEXT("Tests/Drinks");
    IFileManager::Get().MakeDirectory(*Output,true);
    for(int Level:{0,4,8})
    {
        if(!TestTrue(TEXT("Load beer model"),Glass->UseModel(FString::Printf(TEXT("drink_beer_%d"),Level))))break;
        for(int Frame=0;Frame<24;++Frame)
        {Preview.GetWorld()->Tick(LEVELTICK_All,1.f/30);Capture->CaptureScene();FlushRenderingCommands();}
        TArray<FColor> Pixels;
        if(!TestTrue(TEXT("Read beer pixels"),Target->GameThread_GetRenderTargetResource()->ReadPixels(Pixels)&&Pixels.Num()==Width*Height))break;
        int Golden=0,Visible=0;double Red=0,Green=0,Blue=0;
        for(const FColor& P:Pixels)
        {
            if(P.R>80&&P.G>45&&P.R>P.G*1.1&&P.B<P.G*.7)++Golden;
            if(P.R>12||P.G>12||P.B>12)++Visible;
            Red+=P.R;Green+=P.G;Blue+=P.B;
        }
        AddInfo(FString::Printf(TEXT("Beer level %d: golden=%d, visible=%d, mean RGB=%.1f/%.1f/%.1f"),
            Level,Golden,Visible,Red/Pixels.Num(),Green/Pixels.Num(),Blue/Pixels.Num()));
        if(Level==0)TestTrue(TEXT("Empty glass must not look like golden beer"),Golden<300);
        else TestTrue(FString::Printf(TEXT("Beer at level %d contains golden pixels, not black liquid"),Level),Golden>300);
        TestTrue(TEXT("Save beer capture"),FFileHelper::CreateBitmap(*(Output/FString::Printf(TEXT("Beer-%d.bmp"),Level)),Width,Height,Pixels.GetData()));
    }
    Preview.RemoveComponent(Capture);Glass->Destroy();
    return !HasAnyErrors();
}
#endif
