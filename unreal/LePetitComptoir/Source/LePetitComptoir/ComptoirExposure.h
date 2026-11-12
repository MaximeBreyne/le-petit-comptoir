#pragma once
#include "CoreMinimal.h"
#include "Engine/Scene.h"

namespace ComptoirExposure
{
// Fixed exposure for the venue's lights in lumens. Keep the camera and the
// generated level on the same baseline: camera overrides replace volume values.
constexpr float BaselineBias=-2.f;

inline void Apply(FPostProcessSettings& Settings,float BrightnessPercent=100.f)
{
    const float Brightness=FMath::IsFinite(BrightnessPercent)?FMath::Clamp(BrightnessPercent,65.f,140.f):100.f;
    Settings.bOverride_AutoExposureMethod=true;Settings.AutoExposureMethod=AEM_Manual;
    Settings.bOverride_AutoExposureApplyPhysicalCameraExposure=true;
    Settings.AutoExposureApplyPhysicalCameraExposure=false;
    Settings.bOverride_AutoExposureBias=true;
    Settings.AutoExposureBias=BaselineBias+FMath::Log2(Brightness/100.f);
}
}
