#pragma once
#if WITH_DEV_AUTOMATION_TESTS && WITH_EDITOR
#include "AssetCompilingManager.h"
#include "Components/SceneCaptureComponent2D.h"
#include "Engine/World.h"
#include "Materials/Material.h"
#include "MaterialShaderPrecompileMode.h"
#include "MaterialShared.h"
#include "Misc/AutomationTest.h"
#include "PreviewScene.h"
#include "RenderingThread.h"
#include "RHIShaderPlatform.h"

namespace ComptoirRenderTest
{
// Editor tests only: do this AFTER registering the objects and assigning their
// materials. FinishCompilation alone waits for submitted jobs, not missing jobs
// that on-demand shader compilation has not submitted yet.
// https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UMaterialInterface/SubmitRemainingJobsForWorld
inline void PrepareScene(FPreviewScene& Preview,const TArray<UMaterial*>& RequiredMaterials)
{
    UWorld* World=Preview.GetWorld();
    World->SendAllEndOfFrameUpdates();
    UMaterialInterface::SubmitRemainingJobsForWorld(World,EMaterialShaderPrecompileMode::Synchronous);
    // Also cover explicitly tested materials on standalone preview components
    // or absent from the current variant (e.g. liquid in an empty glass).
    for(UMaterial* Material:RequiredMaterials)
        if(Material)Material->CacheShaders(EMaterialShaderPrecompileMode::Synchronous);
    FAssetCompilingManager::Get().FinishAllCompilation(); // Includes font atlas textures.
    World->SendAllEndOfFrameUpdates();
    FlushRenderingCommands();
    Preview.UpdateCaptureContents();
    FlushRenderingCommands();
}

inline bool CheckMaterial(FAutomationTestBase& Test,UMaterial* Material)
{
    if(!Test.TestNotNull(TEXT("Capture material"),Material))return false;
    const FString Name=Material->GetPathName();
    FMaterialResource* Resource=Material->GetMaterialResource(GMaxRHIShaderPlatform);
    if(!Test.TestNotNull(Name+TEXT(" resource"),Resource))return false;
    for(const FString& Error:Resource->GetCompileErrors())Test.AddError(Name+TEXT(": ")+Error);
    const bool Complete=Resource->GetGameThreadShaderMap()!=nullptr&&Resource->IsGameThreadShaderMapComplete();
    Test.AddInfo(FString::Printf(TEXT("%s: complete shader map=%s, compile errors=%d"),
        *Name,Complete?TEXT("yes"):TEXT("no"),Resource->GetCompileErrors().Num()));
    return Test.TestTrue(Name+TEXT(" has a complete shader map"),Complete)&&Resource->GetCompileErrors().IsEmpty();
}

inline void Capture(FPreviewScene& Preview,USceneCaptureComponent2D* Camera)
{
    for(int Frame=0;Frame<24;++Frame)
    {
        Preview.GetWorld()->Tick(LEVELTICK_All,1.f/30);
        // World::Tick is not the editor's full frame loop. Submit dirty mesh,
        // material and visibility state explicitly before requesting the image.
        Preview.GetWorld()->SendAllEndOfFrameUpdates();
        Camera->CaptureScene();
        FlushRenderingCommands();
    }
}
}
#endif
