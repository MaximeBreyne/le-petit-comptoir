#if WITH_DEV_AUTOMATION_TESTS && WITH_EDITOR
#include "../ComptoirText.h"
#include "ComptoirRenderTest.h"
#include "Components/SceneCaptureComponent2D.h"
#include "Engine/Canvas.h"
#include "Engine/TextureRenderTarget2D.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"
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
    const TSharedRef<ComptoirRenderTest::FSceneTest> Command=MakeShared<ComptoirRenderTest::FSceneTest>();
    auto* Scene=&Command.Get();
    FPreviewScene& Preview=Scene->Preview;
    // DefaultTextMaterialOpaque (and its generated copy) is lit. TextRender's
    // front normal is +X; the generic preview light shines on its back. With a
    // black environment, even the engine's valid font would look black.
    Preview.SetLightDirection(FRotator(0,180,0));
    Preview.SetLightBrightness(3.f);
    Preview.SetLightColor(FColor::White);
    Preview.SetSkyBrightness(0.f);
    constexpr int32 Width=1024,Height=256;
    auto* Target=Scene->Target.Get();
    Target->ClearColor=FLinearColor::Black;
    Target->InitCustomFormat(Width,Height,PF_B8G8R8A8,false);
    Target->UpdateResourceImmediate(true);
    const FString Output=FPaths::ProjectSavedDir()/TEXT("Tests/WorldText");
    IFileManager::Get().MakeDirectory(*Output,true);
    const auto ReadVisiblePixels=[this,Target,Output](const TCHAR* Name)
    {
        FlushRenderingCommands();TArray<FColor> Pixels;
        if(!Target->GameThread_GetRenderTargetResource()->ReadPixels(Pixels)||Pixels.Num()!=Width*Height)
        {AddError(TEXT("Cannot read text render target."));return -1;}
        int32 Lit=0,Peak=0;
        for(const FColor& Pixel:Pixels)
        {
            const int32 Brightness=FMath::Max3(int32(Pixel.R),int32(Pixel.G),int32(Pixel.B));
            if(Brightness>80)++Lit;Peak=FMath::Max(Peak,Brightness);
        }
        AddInfo(FString::Printf(TEXT("%s: visible pixels=%d, peak channel=%d"),Name,Lit,Peak));
        TestTrue(TEXT("Save text capture"),FFileHelper::CreateBitmap(*(Output/(FString(Name)+TEXT(".bmp"))),Width,Height,Pixels.GetData()));
        return Lit;
    };
    // Exercise the same Canvas font route as the in-game HUD, using only € so
    // ordinary Latin letters cannot hide a missing currency glyph.
    UCanvas* Canvas=nullptr;FVector2D Size;FDrawToRenderTargetContext Context;
    UKismetRenderingLibrary::BeginDrawCanvasToRenderTarget(Preview.GetWorld(),Target,Canvas,Size,Context);
    if(Canvas){Canvas->SetDrawColor(FColor::White);Canvas->DrawText(Font,TEXT("€"),40,40,2,2);}
    UKismetRenderingLibrary::EndDrawCanvasToRenderTarget(Preview.GetWorld(),Context);
    TestNotNull(TEXT("Canvas for HUD font"),Canvas);
    TestTrue(TEXT("HUD-Euro has visible text pixels"),ReadVisiblePixels(TEXT("HUD-Euro"))>100);

    // Use the same actor-owned registration path as labels in the actual bar.
    AActor* TextActor=Preview.GetWorld()->SpawnActor<AActor>();
    if(!TestNotNull(TEXT("Text actor"),TextActor))return false;
    UTextRenderComponent* Label=NewObject<UTextRenderComponent>(TextActor);
    TextActor->AddInstanceComponent(Label);TextActor->SetRootComponent(Label);
    ComptoirText::Configure(Label,FString::ChrN(32,TCHAR('W')));
    ComptoirText::FitToPanel(Label,1080,44);
    const FVector NameSize=Label->GetTextLocalSize();
    TestTrue(TEXT("Wide 32-character name fits the frontage"),NameSize.Y>0&&NameSize.Y<=1080.1&&NameSize.Z<=44.1);
    ComptoirText::Configure(Label,TEXT("€"));
    Label->SetWorldSize(45);Label->SetTextRenderColor(FColor::White);
    Label->SetHorizontalAlignment(EHTA_Center);Label->SetVerticalAlignment(EVRTA_TextCenter);
    Label->RegisterComponent();
    USceneCaptureComponent2D* Capture=NewObject<USceneCaptureComponent2D>();
    Scene->Camera=Capture;
    Capture->TextureTarget=Target;Capture->bCaptureEveryFrame=false;Capture->bCaptureOnMovement=false;
    Capture->bAlwaysPersistRenderingState=true;
    Capture->PostProcessBlendWeight=1;
    Capture->CaptureSource=ESceneCaptureSource::SCS_FinalColorLDR;Capture->FOVAngle=60;
    Capture->ShowFlags.SetAtmosphere(false);Capture->ShowFlags.SetFog(false);
    Capture->ShowFlags.SetMotionBlur(false);
    Capture->ShowFlags.SetTextRender(true);
    Capture->PostProcessSettings.bOverride_AutoExposureMethod=true;
    Capture->PostProcessSettings.AutoExposureMethod=AEM_Manual;
    Capture->PostProcessSettings.bOverride_AutoExposureApplyPhysicalCameraExposure=true;
    Capture->PostProcessSettings.AutoExposureApplyPhysicalCameraExposure=false;
    Capture->PostProcessSettings.bOverride_AutoExposureBias=true;
    Capture->PostProcessSettings.AutoExposureBias=0;
    Preview.AddComponent(Capture,FTransform(FRotator(0,180,0),FVector(250,0,0)));
    Scene->Prepare({Material});
    TestTrue(TEXT("Label uses the generated font and matching material"),Label->Font.Get()==Font&&Label->GetMaterial(0)==Material);
    AddInfo(FString::Printf(TEXT("World text: font=%s, material=%s, local size=%s"),
        *Font->GetPathName(),*Material->GetPathName(),*Label->GetTextLocalSize().ToString()));
    AddInfo(FString::Printf(TEXT("World text lighting: normal=%s, light direction=%s, front illumination=%.2f"),
        *Label->GetForwardVector().ToString(),*Preview.GetLightDirection().Vector().ToString(),
        FVector::DotProduct(Label->GetForwardVector(),-Preview.GetLightDirection().Vector())));
    TestTrue(TEXT("Key light illuminates the text front"),
        FVector::DotProduct(Label->GetForwardVector(),-Preview.GetLightDirection().Vector())>.9);
    Scene->Then([Label]{Label->SetVisibility(false);});
    Scene->WarmUp();
    Scene->Then([this,ReadVisiblePixels]
    {
        const int32 Empty=ReadVisiblePixels(TEXT("World-Empty"));
        TestTrue(TEXT("Hidden text leaves a black capture"),Empty>=0&&Empty<100);
    });
    Scene->Then([Label]{Label->SetVisibility(true);});
    Scene->WarmUp();
    Scene->Then([this,Scene,Material,ReadVisiblePixels]
    {
        ComptoirRenderTest::CheckMaterial(*this,Scene->Preview,Material);
        TestTrue(TEXT("World-Euro has visible text pixels"),ReadVisiblePixels(TEXT("World-Euro"))>100);
    });
    Scene->Then([Capture]
    {
        Capture->SetWorldLocation(FVector(-250,0,0));Capture->SetWorldRotation(FRotator::ZeroRotator);
    });
    Scene->WarmUp();
    Scene->Then([ReadVisiblePixels]{ReadVisiblePixels(TEXT("World-Euro-Reverse"));});
    Scene->Then([Scene,Capture,Label]
    {
        Capture->SetWorldLocation(FVector(250,0,0));Capture->SetWorldRotation(FRotator(0,180,0));
        const UTextRenderComponent* Defaults=GetDefault<UTextRenderComponent>();
        Label->SetFont(Defaults->Font.Get());Label->SetTextMaterial(Defaults->TextMaterial.Get());
        Label->SetText(FText::FromString(TEXT("A")));
        Scene->Prepare({Defaults->TextMaterial->GetMaterial()});
    });
    Scene->WarmUp();
    Scene->Then([this,Scene,ReadVisiblePixels]
    {
        ComptoirRenderTest::CheckMaterial(*this,Scene->Preview,GetDefault<UTextRenderComponent>()->TextMaterial->GetMaterial());
        TestTrue(TEXT("Engine default font control is visible"),ReadVisiblePixels(TEXT("World-DefaultFont"))>100);
    });
    FAutomationTestFramework::Get().EnqueueLatentCommand(Command);
    return true;
}
#endif
