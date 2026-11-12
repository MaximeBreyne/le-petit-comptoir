#pragma once
#include "OriginalGeometry.h"

// Render-only refinement. All dimensions, pivots and gameplay collision remain
// in the original scene's metre coordinates. No tessellation runs during Tick.
namespace ComptoirVisualGeometry
{
using namespace ComptoirGeometry;
inline Vec Sub(Vec A,Vec B){return {A.X-B.X,A.Y-B.Y,A.Z-B.Z};}
inline Vec Cross(Vec A,Vec B){return {A.Y*B.Z-A.Z*B.Y,A.Z*B.X-A.X*B.Z,A.X*B.Y-A.Y*B.X};}
inline double Dot(Vec A,Vec B){return A.X*B.X+A.Y*B.Y+A.Z*B.Z;}
inline double& Axis(Vec& V,int A){return A==0?V.X:A==1?V.Y:V.Z;}
inline double Bevel(const Shape& S,int Material)
{
    const double Thin=std::min({S.Size.X,S.Size.Y,S.Size.Z});
    if(S.Kind!=0||Thin<.009||Material==6||Material==7||Material==11||Material==14||Material==16)return 0;
    // Millimetre-scale joinery, rather than changing the footprint of furniture.
    const double Radius=Material==5?.002:(Material==8||Material==13)?.006:.004;
    return std::min(Radius,Thin*.12);
}
// Stable metre UVs per face. This also prevents sliding grain on street actors.
inline Vec SurfaceUV(const Shape& S,Vec P,Vec N)
{
    P={P.Y*.01-S.Position.X,P.Z*.01-S.Position.Y,P.X*.01-S.Position.Z};
    N={N.Y,N.Z,N.X};
    for(Vec R:{Vec{0,0,-S.Rotation.Z},Vec{0,-S.Rotation.Y,0},Vec{-S.Rotation.X,0,0}})
    {P=Rotate(P,R);N=Rotate(N,R);}
    const Vec A{std::abs(N.X),std::abs(N.Y),std::abs(N.Z)};
    const int Face=A.Y+1e-6>=A.X&&A.Y+1e-6>=A.Z?1:A.X+1e-6>A.Z?0:2;
    Vec UV;
    if(S.Kind==1&&A.Y<.8)UV={std::atan2(P.Z,P.X)*std::max(S.Size.X,S.Size.Z)*.5,P.Y,0};
    else if(Face==1)UV={P.X,P.Z,0};
    else if(Face==0)UV={P.Z,P.Y,0};
    else UV={P.X,P.Y,0};
    // Broad horizontal timber grain follows the board's longest dimension.
    if(S.Kind==0&&S.Size.X>S.Size.Y&&Face==2)std::swap(UV.X,UV.Y);
    UV.X+=S.Position.X*.371+S.Position.Z*.173;
    UV.Y+=S.Position.Y*.293;
    return UV;
}
template<class Consumer> void Emit(const Shape& S,int Material,Consumer Add)
{
    const auto Vertex=[&](Vec P,Vec N){Add(Point(S,P),Normal(S,N),std::abs(N.Y)<.25);};
    const auto Triangle=[&](Vec A,Vec B,Vec C,Vec NA,Vec NB,Vec NC)
    {
        // UE uses clockwise front faces. Consistent winding also fixes caps.
        if(Dot(Cross(Sub(B,A),Sub(C,A)),NA)>0){std::swap(B,C);std::swap(NB,NC);}
        Vertex(A,NA);Vertex(B,NB);Vertex(C,NC);
    };
    const double Radius=Bevel(S,Material);
    if(S.Kind==0&&Radius>0)
    {
        Vec Half{S.Size.X*.5,S.Size.Y*.5,S.Size.Z*.5},Inner{Half.X-Radius,Half.Y-Radius,Half.Z-Radius};
        const auto Local=[&](Vec P){return Vec{P.X/Half.X,P.Y/Half.Y,P.Z/Half.Z};};
        const auto Tri=[&](Vec A,Vec B,Vec C,Vec N)
        {
            // Normal() inverse-scales; cancel that for a physical chamfer normal.
            N={N.X*S.Size.X,N.Y*S.Size.Y,N.Z*S.Size.Z};
            Triangle(Local(A),Local(B),Local(C),N,N,N);
        };
        const auto Quad=[&](Vec A,Vec B,Vec C,Vec D,Vec N){Tri(A,B,C,N);Tri(A,C,D,N);};
        for(int F=0;F<3;++F)for(int Sign:{-1,1})
        {
            const int U=(F+1)%3,V=(F+2)%3;
            Vec N{},P[4]{};Axis(N,F)=Sign;
            for(int I=0;I<4;++I){Axis(P[I],F)=Sign*Axis(Half,F);Axis(P[I],U)=(I==0||I==3?-1:1)*Axis(Inner,U);Axis(P[I],V)=(I<2?-1:1)*Axis(Inner,V);}
            Quad(P[0],P[1],P[2],P[3],N);
        }
        for(int Along=0;Along<3;++Along)for(int SU:{-1,1})for(int SV:{-1,1})
        {
            const int U=(Along+1)%3,V=(Along+2)%3;
            Vec P[4]{},N{};Axis(N,U)=SU;Axis(N,V)=SV;
            for(int I=0;I<4;++I){Axis(P[I],Along)=(I<2?-1:1)*Axis(Inner,Along);Axis(P[I],U)=SU*Axis(I==0||I==3?Half:Inner,U);Axis(P[I],V)=SV*Axis(I==0||I==3?Inner:Half,V);}
            Quad(P[0],P[1],P[2],P[3],N);
        }
        for(int X:{-1,1})for(int Y:{-1,1})for(int Z:{-1,1})
        {
            const Vec N{double(X),double(Y),double(Z)};
            Tri({X*Half.X,Y*Inner.Y,Z*Inner.Z},{X*Inner.X,Y*Half.Y,Z*Inner.Z},
                {X*Inner.X,Y*Inner.Y,Z*Half.Z},N);
        }
    }
    else if(S.Kind==0)ComptoirGeometry::Emit(S,Add);
    else if(S.Kind==1)
    {
        constexpr int Segments=32;
        const double Slope=(S.Bottom-S.Top)/2;
        for(int I=0;I<Segments;++I)
        {
            const double A=I*2*Pi/Segments,B=(I+1)*2*Pi/Segments;
            const Vec N{std::cos(A),Slope,std::sin(A)},M{std::cos(B),Slope,std::sin(B)};
            const Vec L{N.X*S.Bottom,-1,N.Z*S.Bottom},R{M.X*S.Bottom,-1,M.Z*S.Bottom},T{N.X*S.Top,1,N.Z*S.Top},U{M.X*S.Top,1,M.Z*S.Top};
            Triangle(L,R,U,N,M,M);Triangle(L,U,T,N,M,N);
            if(S.Bottom>0)Triangle({0,-1,0},L,R,{0,-1,0},{0,-1,0},{0,-1,0});
            if(S.Top>0)Triangle({0,1,0},T,U,{0,1,0},{0,1,0},{0,1,0});
        }
    }
    else
    {
        constexpr int Rings=12,Segments=24;
        const auto Sphere=[](int I,int J){const double P=-Pi/2+I*Pi/Rings,T=J*Pi*2/Segments;return Vec{std::cos(P)*std::cos(T),std::sin(P),std::cos(P)*std::sin(T)};};
        for(int I=0;I<Rings;++I)for(int J=0;J<Segments;++J)
        {
            const Vec A=Sphere(I,J),B=Sphere(I+1,J),C=Sphere(I+1,J+1),D=Sphere(I,J+1);
            if(I<Rings-1)Triangle(A,B,C,A,B,C);
            if(I>0)Triangle(A,C,D,A,C,D);
        }
    }
}
}
