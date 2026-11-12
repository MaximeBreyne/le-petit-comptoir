#pragma once

// Native tablet layout, based on the historical web tablet styling. Kept independent of Unreal so
// the same drawing commands and hit regions can be inspected outside the engine.
#include "SessionFlow.h"
#include "DrinkCatalog.h"
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <iomanip>
#include <locale>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

namespace ComptoirTablet
{
enum class Page { Service, Orders, Register, Reserve, Developer };
enum class Kind { Rect, Rounded, Text, Line, Logo, Hit, Input };
struct Command
{
    Kind Type;
    float X=0,Y=0,W=0,H=0,Radius=0,Font=0;
    std::uint32_t Color=0;
    std::string Value;
    float Opacity=1;
};
struct GuestLine
{
    int Id=0,Recipe=0,Phase=0;
    double Remaining=0;
    bool Near=false;
};
struct State
{
    Page Active=Page::Orders;
    ComptoirSession::Screen View=ComptoirSession::Screen::Playing;
    bool CanContinue=false,HasSave=false,ValidName=true,Developer=false,ClockPaused=false;
    std::array<std::string,4> Slots{};std::array<bool,4> ValidSlots{};
    std::array<std::string,7> Settings{};std::string Confirmation;
    bool ColdPicker=false,NearFridge=false;
    std::string SaveSummary,BarName="Le Petit Comptoir",PendingName="Le Petit Comptoir";
    int Cash=0,Sold=0,Day=1,Held=0,Vessel=0,Payment=-1,Processing=-1;
    double Time=1020,Amount=0;
    bool Open=false,Closing=false,Bankrupt=false,NearTill=false,GlassPicker=false,NearRack=false;
    std::array<GuestLine,3> Guests{};
    std::array<int,Comptoir::DrinkCount> Stock{{1000,150,40,12,12,12}},Reserve{{500,75,20,12,12,12}};
    std::array<double,Comptoir::DrinkCount> Delivery{};
    std::array<int,4> Tray{{-1,-1,-1,-1}};
    std::string Feedback;
};
struct Layout
{
    float Scale=1,X=0,Y=0;
    std::vector<Command> Commands;
};
inline std::string HitTest(const Layout& L,float X,float Y)
{
    if(L.Scale<=0)return {};
    const float LocalX=(X-L.X)/L.Scale,LocalY=(Y-L.Y)/L.Scale;
    for(auto It=L.Commands.rbegin();It!=L.Commands.rend();++It)
        if(It->Type==Kind::Hit&&LocalX>=It->X&&LocalX<It->X+It->W&&LocalY>=It->Y&&LocalY<It->Y+It->H)
            return It->Value;
    return {};
}
inline std::string Money(int Cents)
{
    std::ostringstream Out;Out.imbue(std::locale::classic());
    Out<<std::fixed<<std::setprecision(2)<<Cents/100.0;
    std::string Value=Out.str();std::replace(Value.begin(),Value.end(),'.',',');return Value+" €";
}
inline Layout Build(const State& S,float Width,float Height,float MouseX=-1,float MouseY=-1)
{
    Layout L;
    L.Scale=std::max(.01f,std::min({1.2f,(Width-32)/1120.f,(Height-32)/720.f}));
    L.X=(Width-1120*L.Scale)/2;L.Y=(Height-720*L.Scale)/2;
    const float MX=(MouseX-L.X)/L.Scale,MY=(MouseY-L.Y)/L.Scale;
    constexpr std::uint32_t Muted=0x4b5b46,Green=0x284f3d,Paper=0xf9f8f0,Rule=0xd4d9c8;
    const auto Rect=[&](float X,float Y,float W,float H,std::uint32_t C,float R=0.f)
    {L.Commands.push_back({R>0?Kind::Rounded:Kind::Rect,X,Y,W,H,R,0,C,{}});};
    const auto Text=[&](std::string V,float X,float Y,float Font=13.f,std::uint32_t C=0x213e31,float MaxWidth=0.f)
    {
        const float ReadableSize=std::max(14.f,Font+4.f);
        L.Commands.push_back({Kind::Text,X,Y,MaxWidth,0,0,ReadableSize,C,std::move(V)});
    };
    const auto Line=[&](float X,float Y,float EndX,float EndY,std::uint32_t C)
    {L.Commands.push_back({Kind::Line,X,Y,EndX,EndY,0,0,C,{}});};
    const auto Card=[&](float X,float Y,float W,float H)
    {Rect(X,Y,W,H,Rule,9);Rect(X+1,Y+1,W-2,H-2,Paper,8);};
    const auto Button=[&](const std::string& Id,const std::string& Caption,float X,float Y,float W,bool Enabled=true)
    {
        const bool Hover=Enabled&&MX>=X&&MX<=X+W&&MY>=Y&&MY<=Y+42;
        Rect(X,Y,W,42,Enabled?(Hover?0x3a644b:0x2c523e):0xd8ddcf,5);
        Text(Caption,X+12,Y+12,12,Enabled?0xf5f0df:0x526048,W-24);
        if(Enabled)L.Commands.push_back({Kind::Hit,X,Y,W,42,0,0,0,Id});
    };
    const auto Icon=[&](int Index,float X,float Y,std::uint32_t C)
    {
        const auto Seg=[&](float A,float B,float D,float E){Line(X+A,Y+B,X+D,Y+E,C);};
        if(Index==0){Seg(1,10,23,10);Seg(4,10,4,22);Seg(20,10,20,22);Seg(8,3,16,3);Seg(8,3,8,7);Seg(16,3,16,7);Seg(8,7,16,7);}
        else if(Index==1){Seg(6,2,18,2);Seg(6,2,8,15);Seg(18,2,16,15);Seg(8,15,16,15);Seg(12,15,12,22);Seg(7,22,17,22);}
        else if(Index==2){Seg(3,13,21,13);Seg(3,13,3,22);Seg(3,22,21,22);Seg(21,22,21,13);Seg(6,13,8,5);Seg(8,5,17,5);Seg(17,5,19,13);Seg(8,18,16,18);}
        else if(Index==3){Seg(2,7,12,2);Seg(12,2,22,7);Seg(22,7,12,12);Seg(12,12,2,7);Seg(2,7,2,20);Seg(2,20,12,24);Seg(12,24,22,20);Seg(22,20,22,7);Seg(12,12,12,24);}
        else if(Index==4){Seg(3,22,3,7);Seg(3,7,12,2);Seg(12,2,21,7);Seg(21,7,21,22);Seg(8,22,8,15);Seg(8,15,16,15);Seg(16,15,16,22);}
        else if(Index==5){Seg(3,3,18,3);Seg(18,3,18,11);Seg(18,11,3,11);Seg(3,11,3,3);Seg(18,6,22,6);Seg(22,6,22,14);Seg(22,14,12,14);Seg(12,14,12,22);}
        else if(Index==6){Seg(5,2,19,2);Seg(19,2,19,17);Seg(19,17,12,14);Seg(12,14,5,17);Seg(5,17,5,2);Seg(8,6,16,6);Seg(8,10,16,10);Seg(8,17,8,23);Seg(16,17,16,23);}
        else if(Index==8){Seg(8,5,2,12);Seg(2,12,8,19);Seg(16,5,22,12);Seg(22,12,16,19);Seg(14,3,10,21);}
        else{Rect(X+5,Y+2,8,8,C,4);Seg(2,22,2,17);Seg(2,17,6,13);Seg(6,13,12,13);Seg(12,13,16,17);Seg(16,17,16,22);Seg(18,5,21,8);Seg(21,8,18,11);Seg(19,15,23,19);Seg(23,19,23,22);}
    };
    const auto Ready=[&](int R){return static_cast<int>(std::count(S.Tray.begin(),S.Tray.end(),R));};
    const int Present=static_cast<int>(std::count_if(S.Guests.begin(),S.Guests.end(),[](const GuestLine& G){return G.Phase!=0;}));
    const int TrayCount=static_cast<int>(std::count_if(S.Tray.begin(),S.Tray.end(),[](int R){return R>=0;}));
    if(S.GlassPicker&&S.View==ComptoirSession::Screen::Playing)
    {
        Rect(180,140,760,440,0xd4d9c8,18);Rect(182,142,756,436,Paper,16);
        Text(S.ColdPicker?"RÉFRIGÉRATEUR":"VERRERIE",214,172,12,Muted);Text(S.ColdPicker?"Choisir une boisson fraîche":"Choisir un contenant",214,204,27);
        Text("Choisissez librement, même sans commande en attente.",214,250,13,Muted);
        for(int I=0;I<3;++I)
        {
            const int Recipe=I+(S.ColdPicker?3:0);const auto& R=Comptoir::Drinks[Recipe];const float X=214+I*232.f;
            int Pending=0;for(const auto& G:S.Guests)Pending+=G.Phase==2&&G.Recipe==Recipe;
            Card(X,286,218,172);
            if(I==0||S.ColdPicker){Line(X+98,303,X+120,303,Green);Line(X+98,303,X+101,331,Green);Line(X+120,303,X+117,331,Green);Line(X+101,331,X+117,331,Green);}
            else if(I==1){Line(X+98,303,X+119,303,Green);Line(X+98,303,X+102,320,Green);Line(X+119,303,X+115,320,Green);Line(X+102,320,X+115,320,Green);Line(X+108,320,X+108,332,Green);Line(X+101,332,X+116,332,Green);}
            else{Rect(X+97,306,22,21,Green,4);Line(X+119,310,X+126,310,Green);Line(X+126,310,X+126,321,Green);Line(X+126,321,X+119,321,Green);Line(X+92,332,X+124,332,Green);}
            Text(R.Name,X+12,346,14,0x213e31,194);
            Text(S.ColdPicker?std::to_string(S.Stock[Recipe])+" bouteilles · "+std::to_string(Pending)+" à servir":std::to_string(Pending)+" à servir · "+std::to_string(Ready(Recipe))+" sur plateau",X+12,374,10,Muted,194);
            Button("glass_"+std::to_string(Recipe),R.Vessel,X+12,403,194,(S.ColdPicker?S.NearFridge:S.NearRack)&&S.Held!=2&&!S.Bankrupt&&TrayCount<4);
        }
        Text(S.Held==2?"Terminez ou jetez la préparation en cours avant de changer.":TrayCount>=4?"Plateau plein : servez ou retirez une boisson.":S.Held==1?"Le contenant vide sera remplacé, sans consommer de stock.":"Les stocks sont déduits au début de la préparation.",214,479,11,Muted,692);
        Button("glass_close","Fermer [Tab]",690,516,218);
        return L;
    }
    if(S.View!=ComptoirSession::Screen::Playing)
    {
        using Screen=ComptoirSession::Screen;
        const bool Home=S.View==Screen::Home,New=S.View==Screen::NewGame;
        // Native adaptation of dev/dist/menus.css: charcoal veil, gold primary action,
        // restrained navigation and the live bar visible to the right.
        Rect(0,0,600,720,0x0a1011);
        for(int I=0;I<104;++I){Rect(600+I*5,0,5,720,0x0a1011);L.Commands.back().Opacity=.90f*(1-I/104.f);}
        L.Commands.push_back({Kind::Logo,58,40,64,64,0,0,0,{}});
        Text(Home?"SIMULATION DE BAR":"LE PETIT COMPTOIR",142,55,12,0xdfc493,390);
        Text(Home?"ÉDITION LOCALE":"Une adresse à faire vivre.",142,83,10,0xc4cec7,390);
        const auto Nav=[&](std::string Id,std::string Caption,float Y,bool Enabled=true,bool Primary=false)
        {
            const bool Hover=Enabled&&MX>=58&&MX<512&&MY>=Y&&MY<Y+42;
            Rect(58,Y,454,42,Primary&&Enabled?0xd4b57b:Hover?0x253331:0x10191a,3);
            Text(Caption,75,Y+12,13,Primary&&Enabled?0x162321:Enabled?0xe1e5df:0xa7b4ac,414);
            if(Enabled)L.Commands.push_back({Kind::Hit,58,Y,454,42,0,0,0,Id});
        };
        if(Home)
        {
            Text("Le Petit",58,133,54,0xf3eee2);Text("Comptoir.",58,199,54,0xdfc493);
            Text("Une soirée. Votre histoire.",58,276,14,0xc4cec7);
            Nav("menu_continue","Continuer la partie",324,S.CanContinue,S.CanContinue);
            Nav("menu_new","Nouvelle partie",374,true,!S.CanContinue);
            Nav("menu_load","Charger une sauvegarde",424);Nav("menu_settings","Réglages",474);Nav("menu_quit","Retour au bureau",524);
            Text(S.SaveSummary.empty()?"Aucune partie enregistrée.":S.SaveSummary,58,583,11,0xc4cec7,454);
            Rect(665,485,423,151,0x0a1011);L.Commands.back().Opacity=.75f;
            Text("LE SERVICE COMMENCE À 17 H",688,506,11,0xdfc493);
            Text("Les lumières sont allumées.",688,544,20,0xf3eee2);
            Text("Il ne manque plus que vous.",688,583,20,0xf3eee2);
        }
        else if(New)
        {
            Text("Une nouvelle",58,155,36,0xf3eee2);Text("histoire ?",58,205,36,0xdfc493);
            Text(S.HasSave?"L’autosauvegarde sera remplacée.":"Choisissez le nom de votre bar.",58,270,13,0xc4cec7,454);
            Text("Vos sauvegardes manuelles seront conservées.",58,300,11,0xc4cec7,454);
            Text("Nom du bar",58,337,13,0xe1e6d8);
            L.Commands.push_back({Kind::Input,58,369,454,46,0,20,0x213e31,S.PendingName});
            Text(S.ValidName?"1 à 32 caractères · visible sur la devanture.":"Saisissez un nom de 1 à 32 caractères, sur une ligne.",58,429,11,0xc4cec7,454);
            Nav("menu_confirm_new","Commencer la nouvelle partie",470,S.ValidName,true);Nav("menu_cancel","Annuler",524);
        }
        else if(S.View==Screen::Pause)
        {
            Text("Une petite pause.",58,157,36,0xf3eee2,520);
            Text("Le bar peut attendre. Reprenez quand vous êtes prêt.",58,222,12,0xc4cec7,500);
            Nav("menu_resume","Reprendre la partie [P]",282,true,true);Nav("menu_save","Sauvegarder la partie",332);
            Nav("menu_load","Charger une sauvegarde",382);Nav("menu_settings","Réglages",432);
            Nav("menu_home","Retour au menu principal",482);Nav("menu_quit","Retour au bureau",532);
        }
        else if(S.View==Screen::Load||S.View==Screen::Save)
        {
            const bool Loading=S.View==Screen::Load;
            Text(Loading?"Retrouver votre soirée.":"Garder une trace.",58,157,30,0xf3eee2,520);
            Text(Loading?"Choisissez la partie à retrouver.":"Trois emplacements pour conserver vos soirées.",58,218,12,0xc4cec7,500);
            int Row=0;for(int I=Loading?0:1;I<4;++I,++Row)
            {
                const float Y=268+Row*77.f;
                Nav("slot_"+std::to_string(I),I==0?"Sauvegarde automatique":"Emplacement "+std::to_string(I),Y,!Loading||S.ValidSlots[I]);
                Text(S.Slots[I].empty()?"Emplacement vide":S.Slots[I],75,Y+47,10,0xc4cec7,465);
            }
            Nav("menu_back","Retour",594);
        }
        else if(S.View==Screen::Settings)
        {
            Text("Réglages",58,141,36,0xf3eee2);Text("Cliquez sur une valeur pour la modifier.",58,201,12,0xc4cec7);
            const char* Keys[]={"quality","fps","window","sensitivity","fov","brightness","invert"};
            const char* Titles[]={"Qualité graphique","Limite d’images/s","Affichage","Sensibilité souris","Champ de vision","Luminosité","Inverser l’axe vertical"};
            for(int I=0;I<7;++I)Nav(std::string("setting_")+Keys[I],std::string(Titles[I])+" : "+S.Settings[I],247+I*48.f);
            Nav("menu_back","Retour",602);
        }
        else
        {
            Text("Confirmer votre choix",58,157,31,0xf3eee2,520);
            Text(S.Confirmation,58,235,13,0xc4cec7,485);
            Text("La progression précédente sera remplacée.",58,267,12,0xc4cec7,485);
            Nav("slot_confirm","Confirmer",330,true,true);Nav("slot_cancel","Annuler",382);
        }
        Text(S.Feedback,58,654,11,0xdfc493,1000);
        Rect(0,682,1120,38,0x0a1011);L.Commands.back().Opacity=.9f;
        Line(58,691,1060,691,0x506057);Text("LE PETIT COMPTOIR",58,701,9,0xb1c0b7);Text("Une adresse à faire vivre.",842,701,9,0xb1c0b7);
        return L;
    }
    // Landscape device: dark bezel, inset screen and the original light/green palette.
    Rect(5,9,1110,711,0x070e0b,30);Rect(0,0,1120,714,0x59605a,30);
    Rect(2,2,1116,710,0x121a18,28);Rect(13,13,1094,688,0xedece4,19);
    Rect(13,13,1094,91,0x183c30,19);Rect(13,57,1094,47,0x183c30);
    Rect(556,4,8,5,0x040806,2);
    L.Commands.push_back({Kind::Logo,37,36,42,42,0,0,0,{}});
    Text(S.BarName,91,38,14,0xede8d8,490);Text("TABLETTE DE GESTION",91,61,10,0xb8c6b4);
    Rect(604,48,6,6,S.Open?0x92c49b:0xafa58c,3);
    Text(S.Closing?"Dernière tournée":S.Open?"Ouvert":"Fermé",620,45,12,0xe1e6d8);
    Text(Money(S.Cash),784,34,23,0xe9c27c,150);Button("tablet","Ranger [Tab]",950,32,136);
    Rect(13,104,173,553,0xe1e4d9);Rect(185,104,1,553,0xcbd4c4);
    const char* Names[]={"Service","À préparer","Caisse","Réserve","Bâtiment","Décoration","Licences","Équipe","Développeur"};
    const char* Keys[]={"tab_service","tab_orders","tab_register","tab_reserve","","","","","tab_developer"};
    for(int I=0;I<9;++I)
    {
        const float Y=120+I*51.f;const bool Active=(I<4&&I==static_cast<int>(S.Active))||(I==8&&S.Active==Page::Developer),Enabled=I<4||I==8;
        const bool Hover=Enabled&&MX>=25&&MX<=174&&MY>=Y&&MY<=Y+47;
        if(Active||Hover)Rect(25,Y,149,47,Active?Green:0xd3dacc,7);
        const std::uint32_t Color=Active?0xf2e6ca:Enabled?0x344e3e:0x53604d;
        Icon(I,36,Y+12,Color);Text(Names[I],70,Y+(Enabled?14:7),I==8?10:13,Color,96);
        if(!Enabled)Text("À venir",70,Y+28,9,0x53604d);
        else L.Commands.push_back({Kind::Hit,25,Y,149,47,0,0,0,Keys[I]});
    }
    Text("Votre bar,",37,602,11,Muted);Text("à portée de main.",37,623,11,Muted);
    const char* Eyebrows[]={"LA SALLE ET LES COMMANDES","LES BOISSONS COMMANDÉES","ENCAISSEMENTS & TERMINAL","STOCKS & FOURNISSEUR","OUTILS DE TEST DE CETTE PARTIE"};
    const int P=std::clamp(static_cast<int>(S.Active),0,4);
    Text(Eyebrows[P],214,131,10,0x5e5d43);Text(P==4?"Développeur":Names[P],214,155,30);
    const int Minutes=static_cast<int>(S.Time)%1440;
    const std::string Clock=std::to_string(Minutes/60)+":"+(Minutes%60<10?"0":"")+std::to_string(Minutes%60);
    Rect(904,148,174,31,0xe6e8dc,15);Text("Soir "+std::to_string(S.Day)+"  ·  "+Clock,920,157,12,Muted);
    const char* Phases[]={"Place disponible","Commande à prendre","À préparer","Dégustation","Rejoint la caisse","Paiement attendu","Carte en cours"};
    if(S.Active==Page::Service||S.Active==Page::Orders)
    {
        if(S.Active==Page::Service)
        {
            Rect(214,210,864,70,0xe2e7d9,8);
            Text(S.Bankrupt?"Votre trésorerie est épuisée.":S.Closing?"Terminez tous les clients avant de fermer.":S.Open?"Le bar accueille jusqu’à trois clients simultanés.":"Ouvrez le bar pour accueillir vos premiers clients.",230,225,12,Muted,620);
            Text("Service : 17 h à 4 h · fermeture : 35,00 €",230,250,11,Muted);
            Button("service",S.Open?"Dernière tournée":"Ouvrir le bar",865,228,196,!S.Closing&&!S.Bankrupt);
            Text("Clients : "+std::to_string(Present)+" / 3   ·   Encaissés : "+std::to_string(S.Sold),214,302,15);
        }
        else
        {
            Text("Commandes indépendantes · choisissez le verre au rangement avec E.",214,211,12,Muted,864);
            Text("Plateau : "+std::to_string(TrayCount)+" / 4 boissons · préparez aussi à l’avance.",214,245,14);
        }
        const float Top=S.Active==Page::Service?340.f:290.f;
        for(int I=0;I<3;++I)
        {
            const auto& G=S.Guests[I];const auto& R=Comptoir::Drinks[std::clamp(G.Recipe,0,Comptoir::DrinkCount-1)];const float Y=Top+I*86;
            Card(214,Y,864,76);
            Text(G.Phase?"Client #"+std::to_string(G.Id):"Place "+std::to_string(I+1)+" · disponible",230,Y+12,14);
            const std::string Detail=G.Phase==0?"Le prochain client prendra place ici.":G.Phase==1?"Approchez-vous pour prendre sa commande.":std::string(R.Name)+" · "+R.Vessel+" · "+Money(R.Price);
            Text(Detail,230,Y+43,11,Muted,590);
            const bool Action=G.Phase==1||G.Phase==2;
            if(Action)Button("customer_"+std::to_string(I),G.Phase==1?"Prendre commande":Ready(G.Recipe)>0?"Servir du plateau":"Boisson à préparer",850,Y+17,210,G.Near&&!S.Bankrupt&&(G.Phase==1||Ready(G.Recipe)>0));
            else Text(Phases[std::clamp(G.Phase,0,6)],850,Y+26,11,Muted,210);
        }
        if(S.Active==Page::Orders)
        {
            for(int I=0;I<4;++I)
            {
                const float X=214+I*218.f;const int R=S.Tray[I];Card(X,560,210,82);
                Text(R>=0?Comptoir::Drinks[R].Name:"Place libre",X+10,569,10,Muted,190);
                if(R>=0)Button("tray_discard_"+std::to_string(I),"Jeter",X+10,594,190);
            }
        }
    }
    else if(S.Active==Page::Register)
    {
        Rect(214,210,864,56,S.NearTill?0xdfe7d6:0xe9e2cf,4);
        Text(S.NearTill?"Vous êtes devant la caisse.":"Rejoignez la caisse derrière le bar pour encaisser.",231,230,14,S.NearTill?0x466443:0x695632);
        Card(214,286,422,91);Text("Trésorerie",232,303,12,Muted);Text(Money(S.Cash),232,330,27);
        Card(654,286,424,91);Text("Clients encaissés",672,303,12,Muted);Text(std::to_string(S.Sold),672,330,27);
        Card(214,399,864,233);Text("Terminal de paiement · un règlement à la fois",235,418,18);
        int LineIndex=0;
        for(const auto& G:S.Guests)if(G.Phase>=4)
        {
            const auto& R=Comptoir::Drinks[std::clamp(G.Recipe,0,Comptoir::DrinkCount-1)];
            Text("Client #"+std::to_string(G.Id)+" · "+R.Name+" · "+Money(R.Price)+" · "+Phases[G.Phase],235,455+LineIndex++*28,11,Muted,815);
        }
        if(!LineIndex)Text("Aucun règlement en attente.",235,460,14,Muted);
        const int Index=S.Payment>=0?S.Payment:S.Processing;
        std::string Caption="Encaisser par carte";
        if(Index>=0)Caption="Client #"+std::to_string(S.Guests[Index].Id)+" · "+Money(Comptoir::Drinks[S.Guests[Index].Recipe].Price);
        Button("pay_card",S.Processing>=0?"Carte en cours…":Caption,235,568,310,S.Payment>=0&&S.NearTill&&!S.Bankrupt);
    }
    else if(S.Active==Page::Reserve)
    {
        Text("Réapprovisionnez le comptoir et le réfrigérateur depuis la réserve.",214,213,13,Muted);
        Card(214,252,864,370);
        Text("PRODUIT",233,267,10,Muted);Text("DISPONIBLE",490,267,10,Muted);Text("RÉSERVE",665,267,10,Muted);
        for(int I=0;I<Comptoir::DrinkCount;++I)
        {
            const auto& R=Comptoir::Drinks[I];const float Y=295+I*53.f;
            const std::string Unit=I>=3?" bt.":I==2?" doses":" cl";
            Text(R.Name,233,Y+1,12,0x213e31,240);Text(Money(R.PackCost)+" / lot de "+std::to_string(R.Pack),233,Y+26,9,Muted,240);
            Text(std::to_string(S.Stock[I])+Unit,490,Y+9,14);
            Text(S.Delivery[I]>0?"En livraison":std::to_string(S.Reserve[I])+Unit,665,Y+9,12,Muted,170);
            const bool Transfer=S.Reserve[I]>0;
            Button("supply_"+std::to_string(I),Transfer?"Réapprovisionner":"Commander",853,Y,204,!S.Bankrupt&&(Transfer?S.Stock[I]<R.Capacity:S.Delivery[I]<=0&&S.Cash>=R.PackCost));
        }
    }
    else if(S.Active==Page::Developer)
    {
        Rect(214,207,864,70,0xe2e7d9,8);
        Text(S.Developer?"Mode développeur activé pour cette partie.":"Activer les outils de test pour cette partie.",230,219,14,Muted,590);
        Text("Les modifications sont enregistrées dans la sauvegarde.",230,247,11,Muted,590);
        Button("dev_toggle",S.Developer?"Désactiver":"Activer",883,220,178);
        Card(214,293,422,132);Text("Trésorerie",232,307,17);
        Text("Budget de test sans encaissement.",232,338,11,Muted);
        Button("dev_money_100","+100 €",232,369,115,S.Developer);
        Button("dev_money_1000","+1 000 €",357,369,122,S.Developer);
        Button("dev_money_10000","+10 000 €",489,369,128,S.Developer);
        Card(654,293,424,132);Text("Compteur de clients",672,307,17);
        Text("Ajoute au compteur, sans paiement.",672,338,11,Muted);
        Button("dev_progress_25","+25 clients",672,369,180,S.Developer);
        Button("dev_progress_100","+100 clients",866,369,194,S.Developer);
        Card(214,441,422,162);Text("Stocks",232,456,17);
        Text("Comptoir et réfrigérateur au maximum",232,488,11,Muted);
        Text("Termine aussi une livraison en cours.",232,514,11,Muted);
        Button("dev_stock","Remplir les stocks",232,548,385,S.Developer);
        Card(654,441,424,162);Text("Horloge du service",672,456,17);
        Text(S.ClockPaused?"Horloge gelée · les clients continuent.":"Horloge normale · les clients continuent.",672,488,11,Muted,386);
        Text("Avancer l’heure exige un service ouvert.",672,514,11,Muted);
        Button("dev_clock",S.ClockPaused?"Relancer l’horloge":"Geler l’horloge",672,548,187,S.Developer);
        Button("dev_hour","Avancer de 1 h",872,548,188,S.Developer&&S.Open&&!S.Closing&&!S.Bankrupt);
    }
    Rect(13,657,1094,44,0xe6e7dd,19);Rect(13,657,1094,22,0xe6e7dd);Rect(13,657,1094,1,0xd6dbcd);
    Text(S.Feedback.empty()?"Le service continue pendant la consultation.":S.Feedback,36,674,11,0x3c6142,830);
    Text("Sauvegarde automatique",905,674,11,Muted);
    return L;
}
}
