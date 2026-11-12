#include "../Source/LePetitComptoir/TabletLayout.h"
#include <cassert>
#include <fstream>
#include <iostream>
#include <set>
using namespace ComptoirTablet;

bool Has(const Layout& L,const std::string& Action)
{
    for(const auto& C:L.Commands)if(C.Type==Kind::Hit&&C.Value==Action)return true;
    return false;
}
double Luminance(std::uint32_t Color)
{
    const auto Channel=[](int V){const double C=V/255.;return C<=.04045?C/12.92:std::pow((C+.055)/1.055,2.4);};
    return .2126*Channel((Color>>16)&255)+.7152*Channel((Color>>8)&255)+.0722*Channel(Color&255);
}
void CheckReadability(const Layout& L)
{
    std::vector<Command> Backgrounds;
    for(const auto& C:L.Commands)
    {
        if(C.Type==Kind::Rect||C.Type==Kind::Rounded)Backgrounds.push_back(C);
        if(C.Type!=Kind::Text)continue;
        assert(C.Font>=14);
        std::uint32_t Background=0xedece4;
        for(const auto& B:Backgrounds)
            if(C.X>=B.X&&C.X<B.X+B.W&&C.Y>=B.Y&&C.Y<B.Y+B.H)Background=B.Color;
        const double A=Luminance(C.Color),B=Luminance(Background);
        const double Contrast=(std::max(A,B)+.05)/(std::min(A,B)+.05);
        if(Contrast<4.5)std::cerr<<"Low text contrast: "<<C.Value<<" = "<<Contrast<<'\n';
        assert(Contrast>=4.5);
    }
}
std::string Escape(const std::string& S)
{
    std::string R;for(char C:S)R+=C=='&'?"&amp;":C=='<'?"&lt;":C=='>'?"&gt;":std::string(1,C);return R;
}
void Preview(const Layout& L,const std::string& File)
{
    std::ofstream Out(File);
    Out<<"<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='800' viewBox='0 0 1280 800'>"
        <<"<rect width='1280' height='800' fill='#35473d'/><g transform='translate("<<L.X<<","<<L.Y<<") scale("<<L.Scale<<")'>";
    for(const auto& C:L.Commands)
    {
        std::ostringstream Color;Color<<'#'<<std::hex<<std::setw(6)<<std::setfill('0')<<C.Color;
        if(C.Type==Kind::Rect||C.Type==Kind::Rounded)
            Out<<"<rect x='"<<C.X<<"' y='"<<C.Y<<"' width='"<<C.W<<"' height='"<<C.H<<"' rx='"<<C.Radius<<"' fill='"<<Color.str()<<"'/>";
        else if(C.Type==Kind::Line)
            Out<<"<path d='M "<<C.X<<' '<<C.Y<<" L "<<C.W<<' '<<C.H<<"' fill='none' stroke='"<<Color.str()<<"' stroke-width='1.5'/>";
        else if(C.Type==Kind::Text)
            Out<<"<text x='"<<C.X<<"' y='"<<C.Y+C.Font*.83f<<"' font-family='DejaVu Sans,sans-serif' font-weight='"<<(C.Font>=22?"bold":"normal")<<"' font-size='"<<C.Font<<"' fill='"<<Color.str()<<"'>"<<Escape(C.Value)<<"</text>";
        else if(C.Type==Kind::Logo)
            Out<<"<circle cx='"<<C.X+C.W/2<<"' cy='"<<C.Y+C.H/2<<"' r='"<<C.W/2<<"' fill='#e9c27c'/>";
    }
    Out<<"</g></svg>";
}
int main(int Argc,char** Argv)
{
    State S;S.Cash=26000;S.Beer=1000;S.Reserve=500;S.Open=true;S.Phase=1;
    int Layouts=0;
    for(const auto& Size:std::vector<std::pair<float,float>>{{800,600},{1280,720},{1920,1080},{3440,1440},{2560,720}})
    for(int P=0;P<4;++P)
    for(int Phase=0;Phase<7;++Phase)
    {
        S.Active=static_cast<Page>(P);S.Phase=Phase;
        const auto L=Build(S,Size.first,Size.second);
        CheckReadability(L);
        assert(L.X>=0&&L.Y>=0&&L.X+1120*L.Scale<=Size.first+.01&&L.Y+720*L.Scale<=Size.second+.01);
        std::vector<Command> Hits;std::set<std::string> Keys;
        for(const auto& C:L.Commands)
        {
            assert(std::isfinite(C.X)&&std::isfinite(C.Y)&&C.X>=0&&C.Y>=0);
            if(C.Type==Kind::Hit)
            {
                assert(C.X+C.W<=1120&&C.Y+C.H<=720&&C.W>0&&C.H>0);
                assert(Keys.insert(C.Value).second);
                for(const auto& Other:Hits)
                    assert(C.X+C.W<=Other.X||Other.X+Other.W<=C.X||C.Y+C.H<=Other.Y||Other.Y+Other.H<=C.Y);
                Hits.push_back(C);
            }
        }
        for(const char* Key:{"tab_service","tab_orders","tab_register","tab_reserve","tablet"})assert(Has(L,Key));
        assert(!Has(L,"tab_building")&&!Has(L,"tab_decor")&&!Has(L,"tab_licenses")&&!Has(L,"tab_team"));
        ++Layouts;
    }
    S.Active=Page::Service;S.Phase=1;S.NearCustomer=false;assert(!Has(Build(S,1280,800),"take_order"));
    S.NearCustomer=true;assert(Has(Build(S,1280,800),"take_order"));
    S.Closing=true;assert(!Has(Build(S,1280,800),"service"));S.Closing=false;
    S.Active=Page::Register;S.Phase=5;S.NearTill=false;assert(!Has(Build(S,1280,800),"pay_card"));
    S.NearTill=true;assert(Has(Build(S,1280,800),"pay_card"));
    S.Phase=6;assert(!Has(Build(S,1280,800),"pay_card"));
    S.Active=Page::Reserve;S.Beer=900;assert(Has(Build(S,1280,800),"restock"));assert(!Has(Build(S,1280,800),"buy_stock"));
    S.Reserve=0;assert(!Has(Build(S,1280,800),"restock"));assert(Has(Build(S,1280,800),"buy_stock"));
    S.Delivery=5;assert(!Has(Build(S,1280,800),"buy_stock"));S.Delivery=0;
    S.Cash=1599;assert(!Has(Build(S,1280,800),"buy_stock"));
    if(Argc==2)
    {
        S.Cash=26000;S.Reserve=500;S.Phase=1;S.Beer=900;S.Held=2;S.Amount=32;
        for(int P=0;P<4;++P){S.Active=static_cast<Page>(P);Preview(Build(S,1280,800),std::string(Argv[1])+std::to_string(P)+".svg");}
    }
    std::cout<<"PASS: "<<Layouts<<" tablet layouts fit; text contrast >= 4.5:1 and size >= 14; hit regions are unique, nonoverlapping and action availability is enforced.\n";
}
