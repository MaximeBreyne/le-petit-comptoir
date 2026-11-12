#pragma once
#if WITH_DEV_AUTOMATION_TESTS && WITH_EDITOR
#include "ComptoirCaptureSequence.h"
#include "AssetCompilingManager.h"
#include "Components/SceneCaptureComponent2D.h"
#include "CoreGlobals.h"
#include "Engine/TextureRenderTarget2D.h"
#include "Engine/World.h"
#include "Materials/Material.h"
#include "Materials/MaterialRenderProxy.h"
#include "MaterialShaderPrecompileMode.h"
#include "MaterialShared.h"
#include "Misc/AutomationTest.h"
#include "PreviewScene.h"
#include "RenderingThread.h"
#include "RHICommandList.h"
#include "RHIShaderPlatform.h"
#include "SceneInterface.h"
#include "UObject/StrongObjectPtr.h"

namespace ComptoirRenderTest
{
// The framework owns this command until the final latent readback. Keep the
// preview, components, render target and materials alive beyond RunTest's stack.
class FSceneTest final : public IAutomationLatentCommand
{
    ComptoirCaptureSequence::Sequence Sequence;
    TArray<TStrongObjectPtr<UMaterial>> PreparedMaterials;
public:
    FPreviewScene Preview;
    TStrongObjectPtr<UTextureRenderTarget2D> Target;
    USceneCaptureComponent2D* Camera=nullptr;

    explicit FSceneTest(bool bDefaultLighting=true)
        : Preview(FPreviewScene::ConstructionValues().SetCreateDefaultLighting(bDefaultLighting)),
          Target(NewObject<UTextureRenderTarget2D>()) {}

    ~FSceneTest() override {FlushRenderingCommands();}

    void Then(std::function<void()> Action){Sequence.Add(std::move(Action));}
    void Abort(){Sequence.Stop();}
    void WarmUp()
    {
        Then([this]{Camera->bCameraCutThisFrame=true;});
        Sequence.Add([this,FirstFrame=uint64(0),Frames=int32(0)]() mutable
        {
            if(Frames==0)FirstFrame=GFrameCounter;
            Preview.GetWorld()->Tick(LEVELTICK_All,1.f/30);
            Preview.GetWorld()->SendAllEndOfFrameUpdates();
            Preview.UpdateCaptureContents();
            Camera->CaptureScene();
            FlushRenderingCommands();
            if(++Frames==24)UE_LOG(LogTemp,Display,TEXT("Comptoir capture: 24 distinct engine frames, first=%llu, last=%llu"),
                static_cast<unsigned long long>(FirstFrame),static_cast<unsigned long long>(GFrameCounter));
        },24);
    }
    bool Update() override {return Sequence.Update(GFrameCounter);}

    void Prepare(const TArray<UMaterial*>& Materials)
    {
        UWorld* World=Preview.GetWorld();
        World->SendAllEndOfFrameUpdates();
        UMaterialInterface::SubmitRemainingJobsForWorld(World,EMaterialShaderPrecompileMode::Synchronous);
        for(UMaterial* Material:Materials)
        {
            if(!Material||PreparedMaterials.ContainsByPredicate(
                [Material](const TStrongObjectPtr<UMaterial>& P){return P.Get()==Material;}))continue;
            PreparedMaterials.Emplace(Material);
            Material->CacheShaders(EMaterialShaderPrecompileMode::Synchronous);
            // Complete the material interface, including its render proxy's map.
            // Waiting only for already submitted compilation jobs is insufficient.
            Material->EnsureIsComplete();
        }
        FAssetCompilingManager::Get().FinishAllCompilation();
        World->SendAllEndOfFrameUpdates();
        FlushRenderingCommands();
        // WarmUp follows across real engine frames. Do not recache the same
        // materials again between empty/half/full glass models.
    }
};

inline bool CheckMaterial(FAutomationTestBase& Test,FPreviewScene& Preview,UMaterial* Material)
{
    if(!Test.TestNotNull(TEXT("Capture material"),Material))return false;
    const FString Name=Material->GetPathName();
    const EShaderPlatform Platform=Preview.GetScene()->GetShaderPlatform();
    FMaterialResource* Resource=Material->GetMaterialResource(Platform);
    if(!Test.TestNotNull(Name+TEXT(" resource"),Resource))return false;
    for(const FString& Error:Resource->GetCompileErrors())Test.AddError(Name+TEXT(": ")+Error);
    const FMaterialRenderProxy* Proxy=Material->GetRenderProxy();
    if(!Test.TestNotNull(Name+TEXT(" render proxy"),Proxy))return false;
    const auto FeatureLevel=Preview.GetScene()->GetFeatureLevel();
    bool bOwnMaterial=false;
    FString RenderedName;
    // Check what this scene actually draws, on the rendering thread. A flag on
    // the game-thread shader map alone does not identify the rendered material.
    ENQUEUE_RENDER_COMMAND(ComptoirCheckMaterial)(
        [Proxy,FeatureLevel,&bOwnMaterial,&RenderedName](FRHICommandListImmediate&)
        {
            const FMaterialRenderProxy* UsedProxy=nullptr;
            const FMaterial& Rendered=Proxy->GetMaterialWithFallback(FeatureLevel,UsedProxy);
            bOwnMaterial=&Rendered==Proxy->GetMaterialNoFallback(FeatureLevel);
            RenderedName=Rendered.GetFriendlyName();
        });
    FlushRenderingCommands();
    Test.AddInfo(FString::Printf(TEXT("%s: scene platform=%d, feature level=%d, rendered=%s, fallback=%s, compile errors=%d"),
        *Name,int32(Platform),int32(FeatureLevel),*RenderedName,bOwnMaterial?TEXT("no"):TEXT("yes"),Resource->GetCompileErrors().Num()));
    return Test.TestTrue(Name+TEXT(" renders without a fallback material"),bOwnMaterial)&&Resource->GetCompileErrors().IsEmpty();
}
}
#endif
