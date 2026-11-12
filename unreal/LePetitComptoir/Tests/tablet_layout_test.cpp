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
            Out<<"<text x='"<<C.X<<"' y='"<<C.Y+C.Font*.83f<<"' font-family='DejaVu Sans,sans-serif' font-size='"<<C.Font<<"' fill='"<<Color.str()<<"'>"<<Escape(C.Value)<<"</text>";
        else if(C.Type==Kind::Logo)
            Out<<"<circle cx='"<<C.X+C.W/2<<"' cy='"<<C.Y+C.H/2<<"' r='"<<C.W/2<<"' fill='#e9c27c'/>";
    }
    Out<<"</g></svg>";
}
int main(int Argc,char** Argv)
{
    State S;S.Cash=26000;S.Open=true;
    for(int I=0;I<3;++I)S.Guests[I]={I+1,I,1,0,true};
    int Layouts=0;
    for(const auto& Size:std::vector<std::pair<float,float>>{{800,600},{1280,720},{1920,1080},{3440,1440},{2560,720}})
    for(int P=0;P<5;++P)
    for(int Phase=0;Phase<7;++Phase)
    {
        S.Active=static_cast<Page>(P);for(auto& G:S.Guests)G.Phase=Phase;
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
                // The native widget receives local Slate coordinates; translate them
                // through the same responsive layout used for drawing, including margins.
                const float X=L.X+(C.X+C.W*.5f)*L.Scale,Y=L.Y+(C.Y+C.H*.5f)*L.Scale;
                assert(HitTest(L,X,Y)==C.Value);
                for(const auto& Other:Hits)
                    assert(C.X+C.W<=Other.X||Other.X+Other.W<=C.X||C.Y+C.H<=Other.Y||Other.Y+Other.H<=C.Y);
                Hits.push_back(C);
            }
        }
        for(const char* Key:{"tab_service","tab_orders","tab_register","tab_reserve","tab_developer","tablet"})assert(Has(L,Key));
        assert(HitTest(L,-1,-1).empty());
        assert(HitTest(L,L.X+200*L.Scale,L.Y+200*L.Scale).empty());
        assert(HitTest(L,L.X+90*L.Scale,L.Y+370*L.Scale).empty()); // Disabled Bâtiment.
        assert(!Has(L,"tab_building")&&!Has(L,"tab_decor")&&!Has(L,"tab_licenses")&&!Has(L,"tab_team"));
        ++Layouts;
    }
    S.Active=Page::Service;S.Guests[0].Phase=1;S.Guests[0].Near=false;
    assert(!Has(Build(S,1280,800),"customer_0"));S.Guests[0].Near=true;assert(Has(Build(S,1280,800),"customer_0"));
    S.Guests[0].Phase=2;assert(!Has(Build(S,1280,800),"customer_0"));
    S.Tray[0]=1;assert(!Has(Build(S,1280,800),"customer_0")); // A wine cannot serve a beer order.
    S.Tray[0]=0;assert(Has(Build(S,1280,800),"customer_0"));
    S.Closing=true;assert(!Has(Build(S,1280,800),"service"));S.Closing=false;
    S.Active=Page::Register;S.Payment=0;S.NearTill=false;assert(!Has(Build(S,1280,800),"pay_card"));
    S.NearTill=true;assert(Has(Build(S,1280,800),"pay_card"));S.Payment=-1;S.Processing=0;
    assert(!Has(Build(S,1280,800),"pay_card"));
    S.Active=Page::Reserve;
    for(int I=0;I<3;++I)
    {
        const std::string Key="supply_"+std::to_string(I);S.Stock[I]=0;S.Cash=26000;
        assert(Has(Build(S,1280,800),Key));S.Reserve[I]=0;assert(Has(Build(S,1280,800),Key));
        S.Delivery[I]=5;assert(!Has(Build(S,1280,800),Key));S.Delivery[I]=0;
        S.Cash=Comptoir::Drinks[I].PackCost-1;assert(!Has(Build(S,1280,800),Key));
    }
    S.Active=Page::Developer;
    assert(Has(Build(S,1280,800),"dev_toggle"));
    assert(!Has(Build(S,1280,800),"dev_money_1000"));
    S.Developer=true;assert(Has(Build(S,1280,800),"dev_money_1000"));
    S.Open=false;assert(!Has(Build(S,1280,800),"dev_hour"));
    S.Open=true;assert(Has(Build(S,1280,800),"dev_hour"));
    S.Closing=true;assert(!Has(Build(S,1280,800),"dev_hour"));S.Closing=false;
    for(const auto View:{ComptoirSession::Screen::Home,ComptoirSession::Screen::Pause,ComptoirSession::Screen::NewGame})
    for(const auto& Size:std::vector<std::pair<float,float>>{{800,600},{1280,720},{1920,1080},{3440,1440}})
    {
        S.View=View;const auto L=Build(S,Size.first,Size.second);CheckReadability(L);
        std::vector<Command> Interactive;
        for(const auto& C:L.Commands)if(C.Type==Kind::Hit||C.Type==Kind::Input)
        {
            for(const auto& Other:Interactive)
                assert(C.X+C.W<=Other.X||Other.X+Other.W<=C.X||C.Y+C.H<=Other.Y||Other.Y+Other.H<=C.Y);
            if(C.Type==Kind::Hit)assert(HitTest(L,L.X+(C.X+C.W/2)*L.Scale,L.Y+(C.Y+C.H/2)*L.Scale)==C.Value);
            Interactive.push_back(C);
        }
        assert(!Has(L,"tablet")&&!Has(L,"tab_developer"));
    }
    S.View=ComptoirSession::Screen::Home;S.CanContinue=false;
    assert(!Has(Build(S,1280,800),"menu_continue"));
    S.CanContinue=true;assert(Has(Build(S,1280,800),"menu_continue"));
    S.View=ComptoirSession::Screen::NewGame;S.ValidName=false;
    assert(!Has(Build(S,1280,800),"menu_confirm_new"));
    S.ValidName=true;assert(Has(Build(S,1280,800),"menu_confirm_new"));
    S.View=ComptoirSession::Screen::Playing;
    S.GlassPicker=true;S.NearRack=true;S.Held=0;S.Tray={{-1,-1,-1,-1}};
    for(const auto& Size:std::vector<std::pair<float,float>>{{800,600},{1280,720},{1920,1080},{3440,1440}})
    {
        const auto L=Build(S,Size.first,Size.second);CheckReadability(L);
        assert(!Has(L,"tablet")&&!Has(L,"tab_service")&&Has(L,"glass_close"));
        for(int I=0;I<3;++I)assert(Has(L,"glass_"+std::to_string(I)));
        std::vector<Command> Hits;
        for(const auto& C:L.Commands)if(C.Type==Kind::Hit)
        {
            assert(HitTest(L,L.X+(C.X+C.W/2)*L.Scale,L.Y+(C.Y+C.H/2)*L.Scale)==C.Value);
            for(const auto& Other:Hits)assert(C.X+C.W<=Other.X||Other.X+Other.W<=C.X||C.Y+C.H<=Other.Y||Other.Y+Other.H<=C.Y);
            Hits.push_back(C);
        }
    }
    S.Held=2;assert(!Has(Build(S,1280,800),"glass_0"));S.Held=0;
    S.NearRack=false;assert(!Has(Build(S,1280,800),"glass_1"));S.NearRack=true;
    S.Tray={{0,1,2,0}};assert(!Has(Build(S,1280,800),"glass_2"));S.GlassPicker=false;
    if(Argc==2)
    {
        S.Cash=26000;S.Reserve={{500,75,20}};S.Stock={{900,135,39}};S.Held=0;S.Amount=0;
        for(int I=0;I<3;++I)S.Guests[I]={I+1,I,2,0,true};
        for(int P=0;P<5;++P){S.Active=static_cast<Page>(P);Preview(Build(S,1280,800),std::string(Argv[1])+std::to_string(P)+".svg");}
        int I=5;
        for(const auto View:{ComptoirSession::Screen::Home,ComptoirSession::Screen::NewGame,ComptoirSession::Screen::Pause})
        {S.View=View;Preview(Build(S,1280,800),std::string(Argv[1])+std::to_string(I++)+".svg");}
    }
    if(Argc==2){S.View=ComptoirSession::Screen::Playing;S.GlassPicker=true;S.Tray={{-1,-1,-1,-1}};Preview(Build(S,1280,800),std::string(Argv[1])+"8.svg");}
    std::cout<<"PASS: "<<Layouts<<" tablet layouts fit; text contrast >= 4.5:1 and size >= 14; responsive hit testing and action availability are enforced.\n";
}
