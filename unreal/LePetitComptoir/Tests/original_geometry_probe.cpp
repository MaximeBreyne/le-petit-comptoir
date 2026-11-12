#include "../Source/LePetitComptoir/OriginalGeometry.h"
#include <iostream>
#ifdef _WIN32
#include <fcntl.h>
#include <io.h>
#endif

int main()
{
#ifdef _WIN32
    _setmode(_fileno(stdout), _O_BINARY);
#endif
    ComptoirGeometry::Shape S;
    while(std::cin>>S.Kind>>S.Position.X>>S.Position.Y>>S.Position.Z>>S.Size.X>>S.Size.Y>>S.Size.Z
        >>S.Rotation.X>>S.Rotation.Y>>S.Rotation.Z>>S.Top>>S.Bottom)
        ComptoirGeometry::Emit(S,[](const ComptoirGeometry::Vec& P,const ComptoirGeometry::Vec& N,bool Side)
        {
            const double Values[]={P.X,P.Y,P.Z,N.X,N.Y,N.Z,Side?1.0:0.0};
            std::cout.write(reinterpret_cast<const char*>(Values),sizeof(Values));
        });
    return std::cin.eof()?0:1;
}
