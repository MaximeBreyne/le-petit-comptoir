#pragma once

// Same primitive topology, Euler order and inverse-scale normals as dist/renderer.js.
// This header is engine independent so conversion can be checked without Unreal.
#include <cmath>
#include <algorithm>

namespace ComptoirGeometry
{
constexpr double Pi = 3.14159265358979323846;
struct Vec { double X=0, Y=0, Z=0; };
struct Shape
{
    Vec Position, Size{1,1,1}, Rotation;
    int Kind=0; // box=0, tapered cylinder=1, ellipsoid=2
    double Top=1, Bottom=1;
};
inline Vec Rotate(Vec P, const Vec& R)
{
    double A=P.Y*std::cos(R.X)-P.Z*std::sin(R.X);
    P.Z=P.Y*std::sin(R.X)+P.Z*std::cos(R.X); P.Y=A;
    A=P.X*std::cos(R.Y)+P.Z*std::sin(R.Y);
    P.Z=-P.X*std::sin(R.Y)+P.Z*std::cos(R.Y); P.X=A;
    A=P.X*std::cos(R.Z)-P.Y*std::sin(R.Z);
    P.Y=P.X*std::sin(R.Z)+P.Y*std::cos(R.Z); P.X=A;
    return P;
}
inline Vec Direction(const Vec& P) { return {P.X,P.Z,P.Y}; }
inline Vec Position(const Vec& P) { return {100*P.X,100*P.Z,100*P.Y}; }
inline Vec Point(const Shape& S, Vec P)
{
    P=Rotate({P.X*S.Size.X/2,P.Y*S.Size.Y/2,P.Z*S.Size.Z/2},S.Rotation);
    return Position({P.X+S.Position.X,P.Y+S.Position.Y,P.Z+S.Position.Z});
}
inline Vec Normal(const Shape& S, const Vec& N)
{
    Vec R=Direction(Rotate({N.X/std::max(.00001,S.Size.X),N.Y/std::max(.00001,S.Size.Y),
        N.Z/std::max(.00001,S.Size.Z)},S.Rotation));
    const double L=std::sqrt(R.X*R.X+R.Y*R.Y+R.Z*R.Z);
    return {R.X/L,R.Y/L,R.Z/L};
}
template<class Consumer> void Emit(const Shape& S, Consumer Add)
{
    const auto V=[&](Vec P,Vec N){Add(Point(S,P),Normal(S,N),std::abs(N.Y)<.25);};
    if(S.Kind==0)
    {
        const Vec Corners[]={{-1,-1,-1},{1,-1,-1},{1,1,-1},{-1,1,-1},
            {-1,-1,1},{1,-1,1},{1,1,1},{-1,1,1}};
        const int Faces[][6]={{0,1,2,0,2,3},{5,4,7,5,7,6},{4,0,3,4,3,7},
            {1,5,6,1,6,2},{3,2,6,3,6,7},{4,5,1,4,1,0}};
        const Vec Normals[]={{0,0,-1},{0,0,1},{-1,0,0},{1,0,0},{0,1,0},{0,-1,0}};
        for(int F=0;F<6;++F)for(int I:Faces[F])V(Corners[I],Normals[F]);
    }
    else if(S.Kind==1)
    {
        const double Slope=(S.Bottom-S.Top)/2;
        for(int I=0;I<16;++I)
        {
            const double A=I*2*Pi/16,B=(I+1)*2*Pi/16;
            const Vec P{std::cos(A),Slope,std::sin(A)},Q{std::cos(B),Slope,std::sin(B)};
            const Vec L{P.X*S.Bottom,-1,P.Z*S.Bottom},R{Q.X*S.Bottom,-1,Q.Z*S.Bottom},
                T{P.X*S.Top,1,P.Z*S.Top},U{Q.X*S.Top,1,Q.Z*S.Top};
            V(L,P);V(R,Q);V(U,Q);V(L,P);V(U,Q);V(T,P);
            V({0,-1,0},{0,-1,0});V(L,{0,-1,0});V(R,{0,-1,0});
            V({0,1,0},{0,1,0});V(T,{0,1,0});V(U,{0,1,0});
        }
    }
    else
    {
        const auto Sphere=[](int I,int J){const double P=-Pi/2+I*Pi/10,T=J*Pi*2/16;
            return Vec{std::cos(P)*std::cos(T),std::sin(P),std::cos(P)*std::sin(T)};};
        for(int I=0;I<10;++I)for(int J=0;J<16;++J)
        {
            const Vec A=Sphere(I,J),B=Sphere(I+1,J),C=Sphere(I+1,J+1),D=Sphere(I,J+1);
            V(A,A);V(B,B);V(C,C);V(A,A);V(C,C);V(D,D);
        }
    }
}
}
