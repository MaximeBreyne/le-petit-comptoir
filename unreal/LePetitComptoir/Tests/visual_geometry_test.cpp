#include "../Source/LePetitComptoir/VisualGeometry.h"
#include <cassert>
#include <iostream>
#include <map>
#include <tuple>
#include <vector>
using namespace ComptoirGeometry;
using Key=std::tuple<long long,long long,long long>;
Key KeyFor(Vec V){return {std::llround(V.X*100000),std::llround(V.Y*100000),std::llround(V.Z*100000)};}
int main(int Argc,char** Argv)
{
    using namespace ComptoirVisualGeometry;
    for(const Vec Size:{Vec{1,.08,.45},Vec{.027,.32,.027},Vec{2,1,.04}})for(int Kind:{0,1,2})
    {
        Shape S;S.Size=Size;S.Kind=Kind;
        std::vector<Vec> Points,Normals;
        Emit(S,1,[&](Vec P,Vec N,bool){Points.push_back(P);Normals.push_back(N);});
        assert(Points.size()%3==0);
        std::map<std::pair<Key,Key>,int> Edges;
        for(size_t I=0;I<Points.size();I+=3)
        {
            const Vec A=Points[I],B=Points[I+1],C=Points[I+2];
            const Vec Area=Cross(Sub(B,A),Sub(C,A));
            assert(Dot(Area,Area)>1e-16);
            assert(Dot(Area,Normals[I])<0); // Correct front faces, including caps.
            for(size_t J=0;J<3;++J)
            {
                auto K=KeyFor(Points[I+J]),L=KeyFor(Points[I+(J+1)%3]);
                if(L<K)std::swap(K,L);
                ++Edges[{K,L}];
            }
        }
        for(const auto& Edge:Edges)assert(Edge.second==2); // No cracks in chamfers / sphere poles.
        for(size_t I=0;I<Points.size();++I)
        {
            const Vec P=Points[I],N=Normals[I];
            assert(std::abs(P.X)<=S.Size.Z*50+1e-8&&std::abs(P.Y)<=S.Size.X*50+1e-8&&std::abs(P.Z)<=S.Size.Y*50+1e-8);
            assert(std::abs(Dot(N,N)-1)<1e-10);
            const auto UV=SurfaceUV(S,P,N);assert(std::isfinite(UV.X)&&std::isfinite(UV.Y));
        }
        // Applying an actor transform cannot change the object's stored texture UVs.
        Shape R=S;R.Rotation={.23,.61,-.34};
        std::vector<Vec> RotatedUV;
        Emit(R,1,[&](Vec P,Vec N,bool){RotatedUV.push_back(SurfaceUV(R,P,N));});
        for(size_t I=0;I<Points.size();++I)
        {
            const auto UV=SurfaceUV(S,Points[I],Normals[I]);
            double DU=std::abs(UV.X-RotatedUV[I].X);
            if(Kind==1)DU=std::min(DU,std::abs(DU-Pi*std::max(Size.X,Size.Z)));
            if(!(DU<1e-6&&std::abs(UV.Y-RotatedUV[I].Y)<1e-6))std::cerr<<Kind<<" "<<I<<" UV "<<UV.X<<","<<UV.Y<<" rotated "<<RotatedUV[I].X<<","<<RotatedUV[I].Y<<"\n";
            assert(DU<1e-6&&std::abs(UV.Y-RotatedUV[I].Y)<1e-6);
        }
    }
    Shape Glass;Glass.Size={.04,.2,.002};
    assert(Bevel(Glass,11)==0&&Bevel(Glass,7)==0);
    // The scene can be piped in to test every exported dimension and count the budget.
    Shape S;int Material,Distant;size_t Shapes=0,Vertices=0;
    while(std::cin>>S.Kind>>Material>>Distant>>S.Position.X>>S.Position.Y>>S.Position.Z>>S.Size.X>>S.Size.Y>>S.Size.Z>>S.Rotation.X>>S.Rotation.Y>>S.Rotation.Z>>S.Top>>S.Bottom)
    {
        auto Check=[&](Vec P,Vec N,bool){assert(std::isfinite(P.X)&&std::isfinite(P.Y)&&std::isfinite(P.Z));assert(std::abs(Dot(N,N)-1)<1e-8);++Vertices;};
        if(Distant)ComptoirGeometry::Emit(S,Check);else Emit(S,Material,Check);++Shapes;
    }
    // The library includes mutually exclusive stock/fill states. Keep a separate
    // fixed active-scene ceiling; adding variants must not increase that ceiling.
    const bool Library=Argc==2&&std::string(Argv[1])=="--all-variants";
    assert(Vertices<(Library?3000000u:2000000u));
    std::cout<<"PASS: closed bevels, round surfaces, normals, bounds and texture coordinates; "<<Shapes<<" scene shapes / "<<Vertices<<" render vertices.\n";
}
