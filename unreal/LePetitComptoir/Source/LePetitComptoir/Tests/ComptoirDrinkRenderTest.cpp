#if WITH_DEV_AUTOMATION_TESTS && WITH_EDITOR
#include "../ComptoirScene.h"
#include "ComptoirRenderTest.h"
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
#include "ProceduralMeshComponent.h"
#include "RenderingThread.h"
#include "RHIShaderPlatform.h"
#include "TextureResource.h"
#include "UObject/StrongObjectPtr.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FComptoirDrinkRenderTest,"LePetitComptoir.Drinks.GoldenBeer",
    EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)

bool FComptoirDrinkRenderTest::RunTest(const FString&)
{
    if(!FApp::CanEverRender()){AddError(TEXT("Beer rendering requires a GPU, without -NullRHI."));return false;}
    TArray<UMaterial*> Materials;
    for(int32 Index:{11,16})
    {
        const FString Path=FString::Printf(TEXT("/Game/Original/Materials/M_Original_%02d.M_Original_%02d"),Index,Index);
        UMaterial* Material=LoadObject<UMaterial>(nullptr,*Path);
        if(!TestNotNull(Path,Material))return false;
        Materials.Add(Material);
    }
    const TSharedRef<ComptoirRenderTest::FSceneTest> Command=MakeShared<ComptoirRenderTest::FSceneTest>();
    // Queued callbacks use this raw pointer: the automation framework retains
    // Command, and no callback captures its shared owner (which would cycle).
    auto* Scene=&Command.Get();
    FPreviewScene& Preview=Scene->Preview;
    constexpr int32 Width=512,Height=512;
    auto* Target=Scene->Target.Get();
    Target->ClearColor=FLinearColor::Black;Target->InitCustomFormat(Width,Height,PF_B8G8R8A8,false);
    Target->UpdateResourceImmediate(true);
    AComptoirScene* Glass=Preview.GetWorld()->SpawnActor<AComptoirScene>();
    if(!TestNotNull(TEXT("Drink actor"),Glass))return false;
    UProceduralMeshComponent* Mesh=Glass->FindComponentByClass<UProceduralMeshComponent>();
    if(!TestNotNull(TEXT("Drink mesh"),Mesh)){Glass->Destroy();return false;}
    Glass->SetAmbientModel();
    USceneCaptureComponent2D* Capture=NewObject<USceneCaptureComponent2D>();
    Scene->Camera=Capture;
    Capture->TextureTarget=Target;Capture->bCaptureEveryFrame=false;Capture->bCaptureOnMovement=false;
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
    Scene->Prepare(Materials);
    for(int Level:{0,4,8})
    {
        Scene->Then([this,Scene,Glass,Mesh,Materials,Level]
        {
            if(!TestTrue(TEXT("Load beer model"),Glass->UseModel(FString::Printf(TEXT("drink_beer_%d"),Level))))
            {Scene->Abort();return;}
            TestTrue(TEXT("Glass uses the translucent material"),Mesh->GetMaterial(11)==Materials[0]&&Materials[0]->GetBlendMode()==BLEND_Translucent);
            if(Level>0)
            {
                const FProcMeshSection* Liquid=Mesh->GetProcMeshSection(16);
                if(!TestNotNull(TEXT("Liquid section"),Liquid)){Scene->Abort();return;}
                TestTrue(TEXT("Liquid has visible geometry and its own material"),
                    Liquid->bSectionVisible&&!Liquid->ProcIndexBuffer.IsEmpty()&&Mesh->GetMaterial(16)==Materials[1]);
                int32 AmberVertices=0;
                for(const FProcMeshVertex& V:Liquid->ProcVertexBuffer)
                    if(V.Color.R>V.Color.G&&V.Color.G>V.Color.B)++AmberVertices;
                TestTrue(TEXT("Liquid mesh carries amber vertex colours"),AmberVertices>100);
                AddInfo(FString::Printf(TEXT("Beer level %d: liquid vertices=%d, amber vertices=%d"),
                    Level,Liquid->ProcVertexBuffer.Num(),AmberVertices));
            }
        });
        Scene->WarmUp();
        Scene->Then([this,Scene,Target,Materials,Level,Output]
        {
            ComptoirRenderTest::CheckMaterial(*this,Scene->Preview,Materials[0]);
            if(Level>0)ComptoirRenderTest::CheckMaterial(*this,Scene->Preview,Materials[1]);
            TArray<FColor> Pixels;
            if(!TestTrue(TEXT("Read beer pixels"),Target->GameThread_GetRenderTargetResource()->ReadPixels(Pixels)&&Pixels.Num()==Width*Height))
            {Scene->Abort();return;}
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
        });
        if(Level>0)
        {
            // Always retain the isolated-liquid control as well as the required
            // full glass. It must keep its colour when the shell is removed.
            Scene->Then([Mesh]{Mesh->SetMeshSectionVisible(11,false);});
            Scene->WarmUp();
            Scene->Then([this,Scene,Target,Level,Output]
            {
                TArray<FColor> Pixels;
                if(!TestTrue(TEXT("Read isolated liquid pixels"),Target->GameThread_GetRenderTargetResource()->ReadPixels(Pixels)&&Pixels.Num()==Width*Height))
                {Scene->Abort();return;}
                int32 Golden=0;
                for(const FColor& P:Pixels)if(P.R>80&&P.G>45&&P.R>P.G*1.1&&P.B<P.G*.7)++Golden;
                AddInfo(FString::Printf(TEXT("Beer level %d without glass shell: golden=%d"),Level,Golden));
                TestTrue(TEXT("Isolated beer liquid is golden"),Golden>300);
                TestTrue(TEXT("Save isolated liquid capture"),FFileHelper::CreateBitmap(
                    *(Output/FString::Printf(TEXT("Beer-%d-LiquidOnly.bmp"),Level)),Width,Height,Pixels.GetData()));
            });
            Scene->Then([Mesh]{Mesh->SetMeshSectionVisible(11,true);});
        }
    }
    FAutomationTestFramework::Get().EnqueueLatentCommand(Command);
    return true; // Latent assertions determine the final automation result.
}
#endif
