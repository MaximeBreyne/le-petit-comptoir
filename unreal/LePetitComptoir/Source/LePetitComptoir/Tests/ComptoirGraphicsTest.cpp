#if WITH_DEV_AUTOMATION_TESTS && WITH_EDITOR
#include "../ComptoirScene.h"
#include "../ComptoirCharacter.h"
#include "ComptoirRenderTest.h"
#include "Camera/CameraComponent.h"
#include "Components/PostProcessComponent.h"
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

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FComptoirGraphicsTest,"LePetitComptoir.Graphics.MaterialsAndViews",
    EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FComptoirGraphicsTest::RunTest(const FString&)
{
    if(!FApp::CanEverRender()){AddError(TEXT("Graphics validation requires a GPU, without -NullRHI."));return false;}
    TArray<UMaterial*> Materials;
    for(int32 I=0;I<17;++I)
    {
        const FString Path=FString::Printf(TEXT("/Game/Original/Materials/M_Original_%02d.M_Original_%02d"),I,I);
        UMaterial* Material=LoadObject<UMaterial>(nullptr,*Path);
        if(!TestNotNull(Path,Material))continue;
        Materials.Add(Material);
    }
    if(HasAnyErrors())return false;
    const TSharedRef<ComptoirRenderTest::FSceneTest> Command=MakeShared<ComptoirRenderTest::FSceneTest>(false);
    auto* Scene=&Command.Get();
    FPreviewScene& Preview=Scene->Preview;
    AComptoirScene* Venue=Preview.GetWorld()->SpawnActor<AComptoirScene>();
    if(!TestNotNull(TEXT("Venue"),Venue))return false;
    if(!TestTrue(TEXT("Build refined venue"),Venue->Build(TEXT("world")))){Venue->Destroy();return false;}
    Venue->SetVenueName(TEXT("Le Petit Comptoir"));
    // Exercise the actual player camera: a level-only capture misses exposure
    // overrides written by Character::Tick after the level's postprocess blend.
    AComptoirCharacter* Player=Preview.GetWorld()->SpawnActor<AComptoirCharacter>();
    if(!TestNotNull(TEXT("Player camera owner"),Player))return false;
    Player->SetActorHiddenInGame(true);
    Player->Camera->PostProcessSettings.AutoExposureBias=0;
    Player->Tick(0.f);
    const auto* VenuePost=Venue->FindComponentByClass<UPostProcessComponent>();
    if(!TestNotNull(TEXT("Venue exposure"),VenuePost))return false;
    TestTrue(TEXT("Player tick preserves the venue exposure baseline"),
        Player->Camera->PostProcessSettings.bOverride_AutoExposureBias&&
        FMath::IsNearlyEqual(Player->Camera->PostProcessSettings.AutoExposureBias,VenuePost->Settings.AutoExposureBias)&&
        Player->Camera->PostProcessSettings.AutoExposureBias<0);
    Scene->Prepare(Materials);
    constexpr int32 Width=1280,Height=720;
    auto* Target=Scene->Target.Get();
    Target->ClearColor=FLinearColor::Black;Target->InitCustomFormat(Width,Height,PF_B8G8R8A8,false);Target->UpdateResourceImmediate(true);
    USceneCaptureComponent2D* Capture=NewObject<USceneCaptureComponent2D>();
    Scene->Camera=Capture;
    Capture->TextureTarget=Target;Capture->bCaptureEveryFrame=false;Capture->bCaptureOnMovement=false;
    Capture->bAlwaysPersistRenderingState=true;Capture->CaptureSource=ESceneCaptureSource::SCS_FinalColorLDR;Capture->FOVAngle=75;
    Capture->PostProcessBlendWeight=1;
    Capture->PostProcessSettings=Player->Camera->PostProcessSettings;
    Preview.AddComponent(Capture,FTransform::Identity);
    const FString Output=FPaths::ProjectSavedDir()/TEXT("Tests/Graphics");IFileManager::Get().MakeDirectory(*Output,true);
    struct View {const TCHAR* Name;FVector Eye,Focus;float FieldOfView=75.f;};
    const View Views[]={{TEXT("Bar"),{810,1040,168},{290,600,140}},
        {TEXT("Service"),{145,600,168},{285,420,135}},
        {TEXT("Street"),{1530,1100,180},{980,600,210}},
        {TEXT("Reserve"),{-80,100,168},{-370,240,145}},
        {TEXT("BehindBar"),{155,600,170},{1155,600,110},107.51f},
        {TEXT("BackBar"),{165,350,170},{65,850,180},90.f}};
    bool bFirstView=true;
    for(const View& V:Views)
    {
        Scene->Then([Capture,V]
        {
            Capture->SetWorldLocation(V.Eye);Capture->SetWorldRotation((V.Focus-V.Eye).Rotation());
            Capture->FOVAngle=V.FieldOfView;
        });
        Scene->WarmUp();
        if(bFirstView)
        {
            Scene->Then([this,Scene,Materials]
            {
                for(UMaterial* Material:Materials)ComptoirRenderTest::CheckMaterial(*this,Scene->Preview,Material);
            });
            bFirstView=false;
        }
        Scene->Then([this,Target,V,Output]
        {
            TArray<FColor> Pixels;
            if(!TestTrue(TEXT("Read view"),Target->GameThread_GetRenderTargetResource()->ReadPixels(Pixels)&&Pixels.Num()==Width*Height))return;
            int32 Visible=0,Clipped=0,NearWhite=0;double Mean=0,Square=0;
            for(const FColor& P:Pixels)
            {
                const double L=(P.R*.2126+P.G*.7152+P.B*.0722);Mean+=L;Square+=L*L;
                if(L>12)++Visible;if(L>245)++NearWhite;
                if(P.R>250&&P.G>250&&P.B>250)++Clipped;
            }
            Mean/=Pixels.Num();Square/=Pixels.Num();
            AddInfo(FString::Printf(TEXT("%s: mean luminance %.1f/255, visible %.2f%%, near-white %.2f%%, clipped %.2f%%"),
                V.Name,Mean,100.*Visible/Pixels.Num(),100.*NearWhite/Pixels.Num(),100.*Clipped/Pixels.Num()));
            TestTrue(FString(V.Name)+TEXT(" is not black or featureless"),Visible>Pixels.Num()*.35&&Mean>35&&Square-Mean*Mean>50);
            // Allow small lamp/specular highlights, not washed-out walls or a
            // white countertop. Requiring all RGB channels to clip missed those.
            TestTrue(FString(V.Name)+TEXT(" retains highlight detail"),NearWhite<Pixels.Num()/10);
            TestTrue(FString(V.Name)+TEXT(" is not overexposed"),Clipped<Pixels.Num()/50);
            TestTrue(TEXT("Save view for inspection"),FFileHelper::CreateBitmap(*(Output/(FString(V.Name)+TEXT(".bmp"))),Width,Height,Pixels.GetData()));
        });
    }
    FAutomationTestFramework::Get().EnqueueLatentCommand(Command);
    return true;
}
#endif
