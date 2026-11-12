#include "ComptoirStreetLife.h"
#include "ComptoirScene.h"
#include "WorldLayout.h"
#include "Engine/World.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"

AComptoirStreetLife::AComptoirStreetLife()
{
    PrimaryActorTick.bCanEverTick=true;
    PrimaryActorTick.TickInterval=1.f/30.f;
}

void AComptoirStreetLife::BeginPlay()
{
    Super::BeginPlay();
    const auto Model=[&](const FString& Name,bool Collision)
    {
        FActorSpawnParameters Params;Params.Owner=this;
        AComptoirScene* Actor=GetWorld()->SpawnActor<AComptoirScene>(FVector::ZeroVector,FRotator::ZeroRotator,Params);
        if(Actor&&!Actor->Build(Name,Collision)){Actor->Destroy();return static_cast<AComptoirScene*>(nullptr);}
        if(Actor)Actor->SetAmbientModel();
        return Actor;
    };
    const TCHAR* Parts[]={TEXT("body"),TEXT("legLeft"),TEXT("legRight"),TEXT("armLeft"),TEXT("armRight")};
    for(int32 Person=0;Person<6;++Person)
        for(const TCHAR* Part:Parts)People.Add(Model(FString::Printf(TEXT("ped%d_%s"),Person%3,Part),false));
    for(int32 I=0;I<2;++I)Cars.Add(Model(FString::Printf(TEXT("traffic%d"),I),true));
    Tick(0);
}

void AComptoirStreetLife::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    Time+=DeltaSeconds;
    const APawn* Player=UGameplayStatics::GetPlayerPawn(this,0);
    const FVector PlayerPosition=Player?Player->GetActorLocation():FVector(155,600,92);
    const FVector Pivots[]={FVector::ZeroVector,FVector(0,-10.5,86.5),FVector(0,10.5,86.5),FVector(0,-24.5,131),FVector(0,24.5,131)};
    for(int32 Person=0;Person<6;++Person)
    {
        const bool Opposite=Person>=3;
        const int Direction=Person%2?1:-1;
        const double Y=ComptoirWorld::Wrap(Person*1370.+Time*(72+Person*5)*Direction,-4200,5200);
        const float Stride=FMath::Sin(Time*6.2+Person)*23.f;
        const FQuat Facing=FRotator(0,Direction>0?-90:90,0).Quaternion();
        const float Scale=.96f+.035f*(Person%3);
        const FVector Position(ComptoirWorld::PavementX(Y,Opposite),Y,
            -86.5f*(1-FMath::Cos(FMath::DegreesToRadians(Stride)))*Scale);
        const bool Near=FVector::DistSquared2D(Position,PlayerPosition)<FMath::Square(5500.f);
        for(int32 Part=0;Part<5;++Part)
        {
            if(!People.IsValidIndex(Person*5+Part))continue;
            AComptoirScene* Mesh=People[Person*5+Part];if(!Mesh)continue;
            Mesh->SetActorHiddenInGame(!Near);if(!Near)continue;
            float Swing=Part?Stride:0;
            if(Part==2||Part==3)Swing=-Swing;
            if(Part>=3)Swing*=.7f;
            Mesh->SetActorScale3D(FVector(Scale));
            Mesh->SetActorLocationAndRotation(Position+Facing.RotateVector(Pivots[Part]*Scale),Facing*FRotator(Swing,0,0).Quaternion());
        }
    }
    for(int32 I=0;I<Cars.Num();++I)
    {
        AComptoirScene* Car=Cars[I];if(!Car)continue;
        const int Direction=I? -1:1;
        const double Lane=I?1500:1350;
        if(!ComptoirWorld::TrafficMustStop(CarY[I],Lane,Direction,PlayerPosition.X,PlayerPosition.Y))
            CarY[I]=ComptoirWorld::Wrap(CarY[I]+DeltaSeconds*(330+I*40)*Direction,-6800,7800);
        Car->SetActorLocationAndRotation(FVector(Lane,CarY[I],-8.5),FRotator(0,Direction>0?180:0,0));
    }
}

void AComptoirStreetLife::EndPlay(const EEndPlayReason::Type Reason)
{
    for(AComptoirScene* Model:People)if(IsValid(Model))Model->Destroy();
    for(AComptoirScene* Model:Cars)if(IsValid(Model))Model->Destroy();
    Super::EndPlay(Reason);
}
