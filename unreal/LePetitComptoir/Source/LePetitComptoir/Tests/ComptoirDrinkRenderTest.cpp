#if WITH_DEV_AUTOMATION_TESTS && WITH_EDITOR
#include "../ComptoirScene.h"
#include "Components/SceneCaptureComponent2D.h"
#include "Engine/TextureRenderTarget2D.h"
#include "Engine/World.h"
#include "Misc/App.h"
#include "Misc/AutomationTest.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "HAL/FileManager.h"
#include "PreviewScene.h"
#include "RenderingThread.h"
#include "TextureResource.h"
#include "UObject/StrongObjectPtr.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FComptoirDrinkRenderTest,"LePetitComptoir.Drinks.GoldenBeer",
    EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)

bool FComptoirDrinkRenderTest::RunTest(const FString&)
{
    if(!FApp::CanEverRender()){AddError(TEXT("Beer rendering requires a GPU, without -NullRHI."));return false;}
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
    Capture->CaptureSource=ESceneCaptureSource::SCS_FinalColorLDR;Capture->FOVAngle=40;
    Capture->ShowFlags.SetAtmosphere(false);Capture->ShowFlags.SetFog(false);Capture->ShowFlags.SetMotionBlur(false);
    // A controlled exposure lets the test distinguish gold from black, even in a dark bar.
    Capture->PostProcessSettings.bOverride_AutoExposureMinBrightness=true;
    Capture->PostProcessSettings.bOverride_AutoExposureMaxBrightness=true;
    Capture->PostProcessSettings.AutoExposureMinBrightness=1;
    Capture->PostProcessSettings.AutoExposureMaxBrightness=1;
    Preview.AddComponent(Capture,FTransform(FRotator(-20,180,0),FVector(65,0,39)));
    const FString Output=FPaths::ProjectSavedDir()/TEXT("Tests/Drinks");
    IFileManager::Get().MakeDirectory(*Output,true);
    for(int Level:{4,8})
    {
        if(!TestTrue(TEXT("Load beer model"),Glass->UseModel(FString::Printf(TEXT("drink_beer_%d"),Level))))break;
        FlushRenderingCommands();Capture->CaptureScene();FlushRenderingCommands();TArray<FColor> Pixels;
        if(!TestTrue(TEXT("Read beer pixels"),Target->GameThread_GetRenderTargetResource()->ReadPixels(Pixels)&&Pixels.Num()==Width*Height))break;
        int Golden=0;
        for(const FColor& P:Pixels)if(P.R>80&&P.G>45&&P.R>P.G*1.1&&P.B<P.G*.7)++Golden;
        TestTrue(FString::Printf(TEXT("Beer at level %d contains golden pixels, not black liquid"),Level),Golden>300);
        TestTrue(TEXT("Save beer capture"),FFileHelper::CreateBitmap(*(Output/FString::Printf(TEXT("Beer-%d.bmp"),Level)),Width,Height,Pixels.GetData()));
    }
    Preview.RemoveComponent(Capture);Glass->Destroy();
    return !HasAnyErrors();
}
#endif
