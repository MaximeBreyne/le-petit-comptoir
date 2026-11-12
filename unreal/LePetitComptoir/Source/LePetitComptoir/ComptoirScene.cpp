#include "ComptoirScene.h"
#include "ComptoirText.h"
#include "VisualGeometry.h"
#include "ComptoirLighting.h"
#include "ProceduralMeshComponent.h"
#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Materials/MaterialInterface.h"
#include "Math/RotationMatrix.h"
#include "Engine/Font.h"
#include "HAL/FileManager.h"

namespace ComptoirSceneData
{
    double Number(const TSharedPtr<FJsonObject>& O,const TCHAR* Key,double Default=0)
    {double Value=Default;O->TryGetNumberField(Key,Value);return Value;}
    bool Flag(const TSharedPtr<FJsonObject>& O,const TCHAR* Key)
    {bool Value=false;O->TryGetBoolField(Key,Value);return Value;}
    FString String(const TSharedPtr<FJsonObject>& O,const TCHAR* Key,const TCHAR* Default=TEXT(""))
    {FString Value=Default;O->TryGetStringField(Key,Value);return Value;}
    FVector Vector(const ComptoirGeometry::Vec& V){return FVector(V.X,V.Y,V.Z);}
    struct Section
    {
        TArray<FVector> Vertices,Normals;
        TArray<FVector2D> UVs;
        TArray<int32> Triangles;
        TArray<FLinearColor> Colors;
    };
    TSharedPtr<FJsonObject> LoadDocument()
    {
        // All customers, moving limbs and vehicles share one parsed source document.
        static TSharedPtr<FJsonObject> Cached;
        static FString CachedPath;
        static FDateTime CachedTime;
        const FString Path=FPaths::ProjectContentDir()/TEXT("OriginalData/scene.json");
        const FDateTime Modified=IFileManager::Get().GetTimeStamp(*Path);
        if(!Cached.IsValid()||Path!=CachedPath||Modified!=CachedTime)
        {
            FString Text;TSharedPtr<FJsonObject> Document;
            if(!FFileHelper::LoadFileToString(Text,*Path)||
               !FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text),Document))return nullptr;
            Cached=Document;CachedPath=Path;CachedTime=Modified;
        }
        return Cached;
    }
}

AComptoirScene::AComptoirScene()
{
    Geometry=CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("OriginalGeometry"));
    SetRootComponent(Geometry);
    Geometry->SetMobility(EComponentMobility::Movable);
    Geometry->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

bool AComptoirScene::Build(const FString& Collection,bool bWithCollision)
{
    using namespace ComptoirSceneData;
    const TSharedPtr<FJsonObject> Document=LoadDocument();
    if(!Document.IsValid())return false;
    const TSharedPtr<FJsonObject>* Collections=nullptr;
    if(!Document->TryGetObjectField(TEXT("collections"),Collections))return false;
    const TArray<TSharedPtr<FJsonValue>>* Items=nullptr;
    if(!(*Collections)->TryGetArrayField(Collection,Items))return false;
    // These instance components are generated with this actor, never separate level actors.
    const auto PreviousComponents=GetInstanceComponents();
    for(UActorComponent* Component:PreviousComponents)
    {
        if(!Component)continue;
        RemoveInstanceComponent(Component);
        Component->DestroyComponent();
    }
    VenueLabels.Reset();VenueLabelSizes.Reset();
    Geometry->ClearAllMeshSections();
    GeometryRevision=0;
    TArray<Section> Sections;Sections.SetNum(17);
    for(const auto& Item:*Items)
    {
        const auto O=Item->AsObject();if(!O.IsValid())continue;
        ComptoirGeometry::Shape S;
        S.Position={Number(O,TEXT("x")),Number(O,TEXT("y")),Number(O,TEXT("z"))};
        S.Size={Number(O,TEXT("w")),Number(O,TEXT("h")),Number(O,TEXT("d"))};
        S.Rotation={Number(O,TEXT("rx")),Number(O,TEXT("ry")),Number(O,TEXT("rz"))};
        if(S.Size.X<=0||S.Size.Y<=0||S.Size.Z<=0)continue;
        S.Kind=String(O,TEXT("shape"))==TEXT("sphere")?2:Flag(O,TEXT("round"))?1:0;
        S.Top=Number(O,TEXT("topRadius"),1);S.Bottom=Number(O,TEXT("bottomRadius"),1);
        const int32 MaterialIndex=FMath::Clamp(static_cast<int32>(Number(O,TEXT("mat"))),0,16);
        const FLinearColor Tint=FLinearColor::FromSRGBColor(FColor::FromHex(String(O,TEXT("c"),TEXT("#ffffff"))));
        const FLinearColor Side=O->HasField(TEXT("sideColor"))?
            FLinearColor::FromSRGBColor(FColor::FromHex(String(O,TEXT("sideColor")))):Tint;
        Section& Batch=Sections[MaterialIndex];
        const int32 FirstVertex=Batch.Vertices.Num();
        const auto AddVertex=[&](const ComptoirGeometry::Vec& P,const ComptoirGeometry::Vec& N,bool IsSide)
        {
            Batch.Triangles.Add(Batch.Vertices.Num());Batch.Vertices.Add(Vector(P));
            Batch.Normals.Add(Vector(N));Batch.Colors.Add(IsSide&&S.Kind!=2?Side:Tint);
            const auto UV=ComptoirVisualGeometry::SurfaceUV(S,P,N);
            Batch.UVs.Add(FVector2D(UV.X,UV.Y));
        };
        const bool bDistant=Flag(O,TEXT("exterior"))&&FMath::Abs(S.Position.X-6)>40;
        if(bDistant)ComptoirGeometry::Emit(S,AddVertex);
        else ComptoirVisualGeometry::Emit(S,MaterialIndex,AddVertex);
        // Unwrap only the seam-crossing cylinder triangles, before interpolation.
        if(S.Kind==1)
        {
            const double Period=ComptoirGeometry::Pi*FMath::Max(S.Size.X,S.Size.Z);
            for(int32 V=FirstVertex;V+2<Batch.UVs.Num();V+=3)
            {
                const double Min=FMath::Min3(Batch.UVs[V].X,Batch.UVs[V+1].X,Batch.UVs[V+2].X);
                const double Max=FMath::Max3(Batch.UVs[V].X,Batch.UVs[V+1].X,Batch.UVs[V+2].X);
                if(Max-Min>Period*.5)for(int32 I=0;I<3;++I)if(Batch.UVs[V+I].X<Max-Period*.5)Batch.UVs[V+I].X+=Period;
            }
        }
        if(bWithCollision&&Flag(O,TEXT("collision")))
        {
            UBoxComponent* Box=NewObject<UBoxComponent>(this);
            AddInstanceComponent(Box);Box->SetupAttachment(Geometry);
            Box->SetBoxExtent(FVector(S.Size.Z,S.Size.X,S.Size.Y)*50);
            const FVector X=Vector(ComptoirGeometry::Direction(ComptoirGeometry::Rotate({0,0,1},S.Rotation)));
            const FVector Y=Vector(ComptoirGeometry::Direction(ComptoirGeometry::Rotate({1,0,0},S.Rotation)));
            Box->SetRelativeLocation(Vector(ComptoirGeometry::Position(S.Position)));
            Box->SetRelativeRotation(FRotationMatrix::MakeFromXY(X,Y).Rotator());
            Box->SetCollisionProfileName(TEXT("BlockAll"));Box->RegisterComponent();
        }
        const FString Caption=String(O,TEXT("label"));
        if(!Caption.IsEmpty())
        {
            const FString Face=String(O,TEXT("labelFace"),TEXT("front"));
            ComptoirGeometry::Vec Offset{0,0,-1},Normal{0,0,-1},Up{0,1,0};
            double Width=S.Size.X,Height=S.Size.Y;
            if(Face==TEXT("back")){Offset.Z=1;Normal.Z=1;}
            else if(Face==TEXT("left")||Face==TEXT("right"))
            {Offset={Face==TEXT("left")?-1.0:1.0,0,0};Normal=Offset;Width=S.Size.Z;}
            else if(Face==TEXT("top")||Face==TEXT("bottom"))
            {Offset={0,Face==TEXT("top")?1.0:-1.0,0};Normal=Offset;Up={0,0,Face==TEXT("top")?1.0:-1.0};Height=S.Size.Z;}
            const FVector N=Vector(ComptoirGeometry::Direction(ComptoirGeometry::Rotate(Normal,S.Rotation)));
            const FVector U=Vector(ComptoirGeometry::Direction(ComptoirGeometry::Rotate(Up,S.Rotation)));
            UTextRenderComponent* Label=NewObject<UTextRenderComponent>(this);
            AddInstanceComponent(Label);Label->SetupAttachment(Geometry);
            ComptoirText::Configure(Label,Caption);Label->SetHorizontalAlignment(EHTA_Center);
            Label->SetVerticalAlignment(EVRTA_TextCenter);
            TArray<FString> Lines;Caption.ParseIntoArrayLines(Lines);int32 Longest=1;
            for(const FString& Line:Lines)Longest=FMath::Max(Longest,Line.Len());
            Label->SetWorldSize(FMath::Min(Width*90/(Longest*.6),Height*80/FMath::Max(1,Lines.Num())));
            Label->SetTextRenderColor(FColor::FromHex(String(O,TEXT("labelColor"),TEXT("#f2e8c9"))));
            Label->SetRelativeLocation(Vector(ComptoirGeometry::Point(S,Offset))+N*.12);
            Label->SetRelativeRotation(FRotationMatrix::MakeFromXZ(N,U).Rotator());
            Label->SetCollisionEnabled(ECollisionEnabled::NoCollision);Label->RegisterComponent();
            if(Flag(O,TEXT("venueName"))){VenueLabels.Add(Label);VenueLabelSizes.Add(FVector2D(Width,Height));}
        }
    }
    for(int32 I=0;I<Sections.Num();++I)
    {
        const Section& Batch=Sections[I];if(Batch.Vertices.IsEmpty())continue;
        Geometry->CreateMeshSection_LinearColor(I,Batch.Vertices,Batch.Triangles,Batch.Normals,
            Batch.UVs,TArray<FVector2D>(),TArray<FVector2D>(),TArray<FVector2D>(),
            Batch.Colors,TArray<FProcMeshTangent>(),false,false);
        const FString MaterialPath=FString::Printf(TEXT("/Game/Original/Materials/M_Original_%02d.M_Original_%02d"),I,I);
        UMaterialInterface* Material=LoadObject<UMaterialInterface>(nullptr,*MaterialPath);
        if(!Material){UE_LOG(LogTemp,Error,TEXT("Missing %s. Run Setup-Unreal.ps1."),*MaterialPath);return false;}
        Geometry->SetMaterial(I,Material);
    }
    if(Collection==TEXT("world"))
    {
        // Bound the playable block, leaving the extended street as distant scenery.
        const auto Boundary=[&](FVector Center,FVector Extent)
        {
            UBoxComponent* Box=NewObject<UBoxComponent>(this);
            AddInstanceComponent(Box);Box->SetupAttachment(Geometry);
            Box->SetRelativeLocation(Center);Box->SetBoxExtent(Extent);
            Box->SetCollisionProfileName(TEXT("BlockAll"));Box->RegisterComponent();
        };
        Boundary(FVector(1430,-2500,150),FVector(460,10,200));
        Boundary(FVector(1430,3500,150),FVector(460,10,200));
        Boundary(FVector(1880,500,150),FVector(10,3010,200));
        ComptoirLighting::Build(this,Geometry);
    }
    GeometryRevision=7;
    CurrentCollection=Collection;
    return true;
}

void AComptoirScene::SetAmbientModel()
{
    SetModelShadows(false);
}

void AComptoirScene::SetModelShadows(bool bEnabled)
{
    Geometry->SetCastShadow(bEnabled);
}

bool AComptoirScene::PrepareWorldFont()
{
    UFont* Font=LoadObject<UFont>(nullptr,TEXT("/Game/Original/Fonts/F_ComptoirWorld.F_ComptoirWorld"));
    if(!Font)return false;
    // Imported glyph rectangles alone do not select the offline rendering path.
    Font->FontCacheType=EFontCacheType::Offline;
    Font->CacheCharacterCountAndMaxCharHeight();
    Font->MarkPackageDirty();
    return ComptoirText::IsUsable(Font);
}

void AComptoirScene::SetVenueName(const FString& Name)
{
    for(int32 I=0;I<VenueLabels.Num();++I)
    {
        UTextRenderComponent* Label=VenueLabels[I];
        if(!IsValid(Label)||!VenueLabelSizes.IsValidIndex(I))continue;
        ComptoirText::Configure(Label,Name);
        const FVector2D Size=VenueLabelSizes[I];
        ComptoirText::FitToPanel(Label,Size.X*90,Size.Y*80);
    }
}

bool AComptoirScene::UseModel(const FString& Collection)
{
    return CurrentCollection==Collection||Build(Collection);
}
