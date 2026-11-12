#pragma once
#include "ComptoirExposure.h"
#include "GameFramework/Actor.h"
#include "Components/RectLightComponent.h"
#include "Components/PointLightComponent.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/SkyAtmosphereComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/PostProcessComponent.h"

// A modest, fully dynamic lighting rig for the procedural venue. No baked
// lightmaps or hardware ray tracing are required on either development PC.
namespace ComptoirLighting
{
template<class T> T* Component(AActor* Owner,USceneComponent* Root)
{
    T* C=NewObject<T>(Owner);Owner->AddInstanceComponent(C);C->SetupAttachment(Root);
    C->SetMobility(EComponentMobility::Movable);return C;
}
inline void Build(AActor* Owner,USceneComponent* Root)
{
    const auto Area=[&](FVector Position,FRotator Rotation,float Width,float Height,float Lumens,float Kelvin,bool Shadows,float Radius)
    {
        auto* L=Component<URectLightComponent>(Owner,Root);
        L->SetRelativeLocation(Position);L->SetRelativeRotation(Rotation);
        L->SetSourceWidth(Width);L->SetSourceHeight(Height);
        L->SetIntensityUnits(ELightUnits::Lumens);L->SetIntensity(Lumens);
        L->SetUseTemperature(true);L->SetTemperature(Kelvin);
        L->SetAttenuationRadius(Radius);L->SetCastShadows(Shadows);
        L->ShadowBias=.35f;L->ContactShadowLength=.04f;L->RegisterComponent();
    };
    // Pendant diffusers: light travels down, not into the ceiling.
    for(int32 Y:{300,600,900})Area(FVector(465,Y,252),FRotator(-90,0,0),46,46,800,3000,true,540);
    // Warm shelf strips and task lighting reveal bottle labels and poured drinks.
    for(int32 Y:{300,600,900})
        Area(FVector(73,Y,172),FRotator(-65,0,0),250,3,140,3100,false,200);
    Area(FVector(200,600,310),FRotator(-90,0,0),680,80,600,3200,true,450);
    Area(FVector(-210,230,325),FRotator(-90,0,0),115,44,800,4000,true,430);
    Area(FVector(62,1110,196),FRotator(-90,0,0),75,32,90,4400,false,180);
    // Daylight is a gentle fill, not a second room-wide key light. Limit its
    // reach so it does not bleach the counter and rear wall from the storefront.
    Area(FVector(984,600,202),FRotator(0,180,0),1050,200,700,6000,true,1000);
    Area(FVector(1040,600,344),FRotator(-65,180,0),850,12,300,3000,false,500);
    for(int32 Y:{-200,1000,2200})
    {
        auto* L=Component<UPointLightComponent>(Owner,Root);
        L->SetRelativeLocation(FVector(1213,Y,349));L->SetIntensityUnits(ELightUnits::Lumens);
        L->SetIntensity(700);L->SetUseTemperature(true);L->SetTemperature(3100);
        L->SetAttenuationRadius(650);L->SetSourceRadius(12);L->SetCastShadows(false);L->RegisterComponent();
    }
    auto* Sun=Component<UDirectionalLightComponent>(Owner,Root);
    Sun->SetRelativeRotation(FRotator(-24,-128,0));Sun->SetIntensity(8);
    Sun->SetUseTemperature(true);Sun->SetTemperature(4700);Sun->SetAtmosphereSunLight(true);
    Sun->LightSourceAngle=2.f;Sun->DynamicShadowDistanceMovableLight=10000;
    Sun->SetDynamicShadowCascades(3);Sun->ContactShadowLength=.04f;Sun->RegisterComponent();
    auto* Atmosphere=Component<USkyAtmosphereComponent>(Owner,Root);
    Atmosphere->RegisterComponent();
    auto* Sky=Component<USkyLightComponent>(Owner,Root);
    Sky->SetRelativeLocation(FVector(1400,600,400));Sky->CubemapResolution=64;
    Sky->SetIntensity(.4f);Sky->SetRealTimeCapture(true);Sky->RegisterComponent();

    auto* Post=Component<UPostProcessComponent>(Owner,Root);Post->bUnbound=true;
    Post->Priority=-1; // User-authored postprocess volumes can override the baseline.
    auto& P=Post->Settings;
    ComptoirExposure::Apply(P);
    P.bOverride_AmbientOcclusionIntensity=true;P.AmbientOcclusionIntensity=.7f;
    P.bOverride_AmbientOcclusionRadius=true;P.AmbientOcclusionRadius=45;
    P.bOverride_AmbientOcclusionQuality=true;P.AmbientOcclusionQuality=60;
    P.bOverride_ReflectionMethod=true;P.ReflectionMethod=EReflectionMethod::ScreenSpace;
    P.bOverride_ScreenSpaceReflectionIntensity=true;P.ScreenSpaceReflectionIntensity=80;
    P.bOverride_ScreenSpaceReflectionQuality=true;P.ScreenSpaceReflectionQuality=60;
    P.bOverride_ScreenSpaceReflectionMaxRoughness=true;P.ScreenSpaceReflectionMaxRoughness=.65f;
    P.bOverride_BloomIntensity=true;P.BloomIntensity=.08f;
    P.bOverride_VignetteIntensity=true;P.VignetteIntensity=.12f;
    P.bOverride_MotionBlurAmount=true;P.MotionBlurAmount=0;
    P.bOverride_SceneFringeIntensity=true;P.SceneFringeIntensity=0;
    Post->RegisterComponent();
}
}
