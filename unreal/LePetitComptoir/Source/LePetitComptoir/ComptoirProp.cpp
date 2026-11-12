#include "ComptoirProp.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/Font.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"

AComptoirProp::AComptoirProp()
{
    Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
    SetRootComponent(Mesh);
    Mesh->SetMobility(EComponentMobility::Movable);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (Cube.Succeeded()) Mesh->SetStaticMesh(Cube.Object);
    Mesh->SetCollisionProfileName(TEXT("BlockAll"));
    Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
    Label->SetupAttachment(Mesh);
    Label->SetAbsolute(false, false, true); // Text must not inherit the mesh scale.
    Label->SetHorizontalAlignment(EHTA_Center);
    Label->SetVerticalAlignment(EVRTA_TextCenter);
    Label->SetWorldSize(13);
    Label->SetTextRenderColor(FColor(238, 221, 172));
    Label->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

void AComptoirProp::Configure(const FVector& Size, const FLinearColor& Color, EComptoirTarget InTarget, const FString& Caption)
{
    Target = InTarget;
    if(UFont* Font=LoadObject<UFont>(nullptr,TEXT("/Game/Original/Fonts/F_ComptoirWorld.F_ComptoirWorld")))
        Label->SetFont(Font);
    if(UMaterialInterface* Text=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Original/Materials/M_ComptoirText.M_ComptoirText")))
        Label->SetTextMaterial(Text);
    Mesh->SetWorldScale3D(Size / 100.0);
    if (UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, TEXT("/Game/Materials/M_Bar.M_Bar")))
    {
        UMaterialInstanceDynamic* Material = UMaterialInstanceDynamic::Create(Base, this);
        Material->SetVectorParameterValue(TEXT("Tint"), Color);
        Mesh->SetMaterial(0, Material);
    }
    Label->SetText(FText::FromString(Caption));
    Label->SetWorldLocation(GetActorLocation() + FVector(0, -Size.Y * .5 - 2, Size.Z * .5 + 20));
    Label->SetWorldRotation(FRotator(0, -90, 0));
}
