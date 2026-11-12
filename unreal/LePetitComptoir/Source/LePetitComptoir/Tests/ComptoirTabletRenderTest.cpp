#if WITH_DEV_AUTOMATION_TESTS && WITH_EDITOR

#include "../SComptoirTablet.h"
#include "Engine/TextureRenderTarget2D.h"
#include "Framework/Application/SlateApplication.h"
#include "HAL/FileManager.h"
#include "Misc/App.h"
#include "Misc/AutomationTest.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Misc/ScopeExit.h"
#include "RenderingThread.h"
#include "Slate/WidgetRenderer.h"
#include "TextureResource.h"
#include "UObject/StrongObjectPtr.h"
#include "UnrealClient.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FComptoirTabletRenderTest,
    "LePetitComptoir.Tablet.RenderedText",
    EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)

bool FComptoirTabletRenderTest::RunTest(const FString&)
{
    // Portable layout tests cannot detect missing glyphs or a broken render path.
    // Render the actual widget, then prove that text changes pixels on every page.
    if(!FSlateApplication::IsInitialized()||!FApp::CanEverRender())
    {
        AddError(TEXT("Tablet rendering requires Slate and a GPU. Do not use -NullRHI."));
        return false;
    }
    constexpr int32 Width=1280,Height=800;
    const FVector2D Size(Width,Height);
    TStrongObjectPtr<UTextureRenderTarget2D> Target(FWidgetRenderer::CreateTargetFor(Size,TF_Bilinear,true));
    if(!TestNotNull(TEXT("Slate render target"),Target.Get()))return false;
    FWidgetRenderer* Renderer=new FWidgetRenderer(true,true);
    ON_SCOPE_EXIT {FlushRenderingCommands();BeginCleanup(Renderer);};
    const TSharedRef<SComptoirTablet> Widget=SNew(SComptoirTablet);
    ComptoirTablet::State State;
    State.Cash=26000;State.NearRack=true;State.NearTill=true;State.NearFridge=true;
    State.ValidSlots={{true,false,true,false}};State.Slots[0]="Chez Élise · Soir 3 · 520,00 €";
    State.Settings={{"Élevée","60","Fenêtré","1.00","75°","100 %","Non"}};State.Confirmation="Charger cette partie ?";
    for(int I=0;I<3;++I)State.Guests[I]={I+1,I,2,0,true};
    State.Tray={{0,1,2,0}};
    const FString Output=FPaths::ProjectSavedDir()/TEXT("Tests/Tablet");
    IFileManager::Get().MakeDirectory(*Output,true);

    for(int32 Page=0;Page<14;++Page)
    {
        State.Developer=true;State.GlassPicker=Page==8||Page==13;State.ColdPicker=Page==13;
        State.Active=static_cast<ComptoirTablet::Page>(FMath::Min(Page,4));
        State.View=Page<5||Page==8?ComptoirSession::Screen::Playing:Page==5?ComptoirSession::Screen::Home:
            Page==6?ComptoirSession::Screen::NewGame:Page==7?ComptoirSession::Screen::Pause:
            Page==9?ComptoirSession::Screen::Load:Page==10?ComptoirSession::Screen::Save:
            Page==11?ComptoirSession::Screen::Settings:Page==12?ComptoirSession::Screen::Confirm:ComptoirSession::Screen::Playing;
        Widget->SetState(State,nullptr);
        const auto Render=[&](bool bText,TArray<FColor>& Pixels)
        {
            Widget->SetTextVisibleForTest(bText);
            Renderer->DrawWidget(Target.Get(),Widget,Size,0.f,false);
            FlushRenderingCommands();
            return Target->GameThread_GetRenderTargetResource()->ReadPixels(Pixels)
                &&Pixels.Num()==Width*Height;
        };
        TArray<FColor> Background,WithText;
        if(!TestTrue(TEXT("Read tablet without text"),Render(false,Background))
            ||!TestTrue(TEXT("Read tablet with text"),Render(true,WithText)))return false;
        const auto Layout=ComptoirTablet::Build(State,Width,Height);
        int32 Changed=0,Title=0;
        for(int32 Y=0;Y<Height;++Y)
        for(int32 X=0;X<Width;++X)
        {
            const int32 I=Y*Width+X;
            const FColor A=Background[I],B=WithText[I];
            if(FMath::Abs(int32(A.R)-B.R)+FMath::Abs(int32(A.G)-B.G)+FMath::Abs(int32(A.B)-B.B)<30)continue;
            ++Changed;
            const float LX=(X-Layout.X)/Layout.Scale,LY=(Y-Layout.Y)/Layout.Scale;
            if((Page==8||Page==13)?(LX>=214&&LX<800&&LY>=204&&LY<244):Page<5?(LX>=214&&LX<600&&LY>=155&&LY<200):(LX>=58&&LX<512&&LY>=155&&LY<270))++Title;
        }
        TestTrue(FString::Printf(TEXT("Page %d: visible text pixels"),Page),Changed>1000);
        TestTrue(FString::Printf(TEXT("Page %d: visible title glyphs"),Page),Title>100);
        const FString Screenshot=Output/FString::Printf(TEXT("Tablet-%d.bmp"),Page);
        TestTrue(TEXT("Save real Slate rendering"),FFileHelper::CreateBitmap(*Screenshot,Width,Height,WithText.GetData()));
    }
    return true;
}

#endif
