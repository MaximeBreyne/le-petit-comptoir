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
#include "TextureResource.h"
#include "UObject/StrongObjectPtr.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FComptoirGraphicsTest,"LePetitComptoir.Graphics.MaterialsAndViews",
    EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FComptoirGraphicsTest::RunTest(const FString&)
{
    if(!FApp::CanEverRender()){AddError(TEXT("Graphics validation requires a GPU, without -NullRHI."));return false;}
    // Reject the default/checkerboard fallback even if it produces visible pixels.
    for(int32 I=0;I<17;++I)
    {
        const FString Path=FString::Printf(TEXT("/Game/Original/Materials/M_Original_%02d.M_Original_%02d"),I,I);
        UMaterial* Material=LoadObject<UMaterial>(nullptr,*Path);
        if(!TestNotNull(Path,Material))continue;
        FMaterialResource* Resource=Material->GetMaterialResource(GMaxRHIFeatureLevel);
        if(!TestNotNull(TEXT("Material resource"),Resource))continue;
        Resource->FinishCompilation();
        for(const FString& Error:Resource->GetCompileErrors())AddError(Path+TEXT(": ")+Error);
        TestTrue(Path+TEXT(" has compiled shaders"),Resource->GetGameThreadShaderMap()!=nullptr);
    }
    if(HasAnyErrors())return false;
    FPreviewScene Preview{FPreviewScene::ConstructionValues().SetCreateDefaultLighting(false)};
    AComptoirScene* Venue=Preview.GetWorld()->SpawnActor<AComptoirScene>();
    if(!TestNotNull(TEXT("Venue"),Venue))return false;
    if(!TestTrue(TEXT("Build refined venue"),Venue->Build(TEXT("world")))){Venue->Destroy();return false;}
    Venue->SetVenueName(TEXT("Le Petit Comptoir"));
    constexpr int32 Width=1280,Height=720;
    TStrongObjectPtr<UTextureRenderTarget2D> Target(NewObject<UTextureRenderTarget2D>());
    Target->ClearColor=FLinearColor::Black;Target->InitCustomFormat(Width,Height,PF_B8G8R8A8,false);Target->UpdateResourceImmediate(true);
    USceneCaptureComponent2D* Capture=NewObject<USceneCaptureComponent2D>();
    Capture->TextureTarget=Target.Get();Capture->bCaptureEveryFrame=false;Capture->bCaptureOnMovement=false;
    Capture->bAlwaysPersistRenderingState=true;Capture->CaptureSource=ESceneCaptureSource::SCS_FinalColorLDR;Capture->FOVAngle=75;
    Preview.AddComponent(Capture,FTransform::Identity);
    const FString Output=FPaths::ProjectSavedDir()/TEXT("Tests/Graphics");IFileManager::Get().MakeDirectory(*Output,true);
    struct View {const TCHAR* Name;FVector Eye,Focus;};
    const View Views[]={{TEXT("Bar"),{810,1040,168},{290,600,140}},
        {TEXT("Service"),{145,600,168},{285,420,135}},
        {TEXT("Street"),{1530,1100,180},{980,600,210}},
        {TEXT("Reserve"),{-80,100,168},{-370,240,145}}};
    for(const View& V:Views)
    {
        Capture->SetWorldLocation(V.Eye);Capture->SetWorldRotation((V.Focus-V.Eye).Rotation());
        // Warm up temporal reflections and the time-sliced sky capture.
        for(int Frame=0;Frame<24;++Frame)
        {Preview.GetWorld()->Tick(LEVELTICK_All,1.f/30);Capture->CaptureScene();FlushRenderingCommands();}
        TArray<FColor> Pixels;
        if(!TestTrue(TEXT("Read view"),Target->GameThread_GetRenderTargetResource()->ReadPixels(Pixels)&&Pixels.Num()==Width*Height))continue;
        int32 Visible=0,Clipped=0;double Mean=0,Square=0;
        for(const FColor& P:Pixels)
        {
            const double L=(P.R*.2126+P.G*.7152+P.B*.0722);Mean+=L;Square+=L*L;
            if(L>12)++Visible;if(P.R>250&&P.G>250&&P.B>250)++Clipped;
        }
        Mean/=Pixels.Num();Square/=Pixels.Num();
        TestTrue(FString(V.Name)+TEXT(" is not black or featureless"),Visible>Pixels.Num()/10&&Square-Mean*Mean>50);
        TestTrue(FString(V.Name)+TEXT(" is not overexposed"),Clipped<Pixels.Num()/2);
        TestTrue(TEXT("Save view for inspection"),FFileHelper::CreateBitmap(*(Output/(FString(V.Name)+TEXT(".bmp"))),Width,Height,Pixels.GetData()));
    }
    Preview.RemoveComponent(Capture);Venue->Destroy();return !HasAnyErrors();
}
#endif
