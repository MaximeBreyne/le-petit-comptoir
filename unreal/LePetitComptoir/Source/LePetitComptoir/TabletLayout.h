#pragma once

// Native tablet layout, based on the historical web tablet styling. Kept independent of Unreal so
// the same drawing commands and hit regions can be inspected outside the engine.
#include "SessionFlow.h"
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
};
struct State
{
    Page Active=Page::Orders;
    ComptoirSession::Screen View=ComptoirSession::Screen::Playing;
    bool CanContinue=false,HasSave=false,ValidName=true,Developer=false,ClockPaused=false;
    std::string SaveSummary,BarName="Le Petit Comptoir",PendingName="Le Petit Comptoir";
    int Cash=0,Beer=0,Reserve=0,Sold=0,Day=1,Phase=0,Held=0;
    double Time=1020,Amount=0,Delivery=0,Remaining=0;
    bool Open=false,Closing=false,Bankrupt=false,NearCustomer=false,NearTill=false;
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
    if(S.View!=ComptoirSession::Screen::Playing)
    {
        const bool Home=S.View==ComptoirSession::Screen::Home;
        const bool Confirm=S.View==ComptoirSession::Screen::NewGame;
        Rect(20,20,530,680,0x183c30,22);
        L.Commands.push_back({Kind::Logo,58,55,64,64,0,0,0,{}});
        Text("LE PETIT COMPTOIR",140,70,19,0xf5f0df);
        Text("UNE ADRESSE À FAIRE VIVRE",140,101,10,0xb8c6b4);
        Text(Home?"Le Petit":Confirm?"Une nouvelle":"Une petite",58,155,43,0xf5f0df);
        Text(Home?"Comptoir.":Confirm?"histoire ?":"pause.",58,211,43,0xe9c27c);
        Text(Home?"Une soirée. Votre histoire.":Confirm?(S.HasSave?"La sauvegarde automatique sera remplacée.":"Choisissez le nom de votre bar."):"Le bar peut attendre.",58,290,14,0xe1e6d8,450);
        if(Home)
        {
            Button("menu_continue","Continuer la partie",58,344,454,S.CanContinue);
            Button("menu_new","Nouvelle partie",58,398,454);
            Button("menu_quit","Retour au bureau",58,452,454);
            Text(S.SaveSummary.empty()?"Aucune partie enregistrée.":S.SaveSummary,58,520,12,0xe1e6d8,454);
        }
        else if(Confirm)
        {
            Text("Nom du bar",58,337,13,0xe1e6d8);
            L.Commands.push_back({Kind::Input,58,369,454,46,0,20,0x213e31,S.PendingName});
            Text(S.ValidName?"1 à 32 caractères · visible sur la devanture.":"Saisissez un nom de 1 à 32 caractères, sur une ligne.",58,429,11,0xe1e6d8,454);
            Button("menu_confirm_new","Commencer la nouvelle partie",58,470,454,S.ValidName);
            Button("menu_cancel","Annuler",58,524,454);
        }
        else
        {
            Button("menu_resume","Reprendre la partie [P]",58,344,454);
            Button("menu_save","Sauvegarder",58,398,454);
            Button("menu_home","Retour à l’accueil",58,452,454);
            Button("menu_quit","Retour au bureau",58,506,454);
        }
        Text(S.Feedback,58,592,12,0xe9c27c,454);
        Rect(570,458,530,230,0x183c30,16);
        Text("LE SERVICE COMMENCE À 17 H",610,486,13,0xf5f0df);
        Text("Les lumières sont allumées.",610,522,22,0xf5f0df);
        Text("Il ne manque plus que vous.",610,560,22,0xf5f0df);
        Text("ZQSD / WASD : marcher   ·   E : interagir",610,625,12,0xf5f0df);
        Text("Tab : tablette   ·   P : pause",610,652,12,0xf5f0df);
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
    const std::string Phase=Phases[std::clamp(S.Phase,0,6)];
    if(S.Active==Page::Service)
    {
        Rect(214,210,864,70,0xe2e7d9,8);
        Text(S.Bankrupt?"Votre trésorerie est épuisée.":S.Closing?"Terminez le service des derniers clients.":S.Open?"Le bar accueille les clients.":"Ouvrez le bar pour accueillir vos premiers clients.",230,225,13,0x52604b);
        Text("Le service se déroule de 17 h à 4 h.",230,248,12,Muted);
        Button("service",S.Open?"Dernière tournée":"Ouvrir le bar",865,228,196,!S.Closing&&!S.Bankrupt);
        Card(214,300,276,77);Text("Clients encaissés",230,315,12,Muted);Text(std::to_string(S.Sold),230,339,23);
        Card(508,300,276,77);Text("Clients présents",524,315,12,Muted);Text(S.Phase==0?"0 / 1":"1 / 1",524,339,23);
        Card(802,300,276,77);Text("Frais de fermeture",818,315,12,Muted);Text("35,00 € / soir",818,339,23);
        Text("Au comptoir",214,401,17);Card(214,435,864,172);
        Text("Comptoir · Client",232,453,17);Text(Phase,815,457,13,0x6b542a);
        Text(S.Phase==0?"Le prochain client prendra place ici.":S.Phase==1?"Approchez-vous pour lui demander ce qu’il souhaite.":"Bière pression · 50 cl · 5,00 €",232,489,14);
        Text(S.Phase==1?(S.NearCustomer?"Vous êtes à portée du client.":"Rejoignez ce client pour prendre sa commande."):"Préparez et servez les boissons derrière le bar.",232,521,12,Muted);
        if(S.Phase==1)Button("take_order","Prendre la commande",232,553,205,S.NearCustomer&&!S.Bankrupt);
        else Button("return_bar","Revenir au bar",232,553,165);
    }
    else if(S.Active==Page::Orders)
    {
        Text("Retrouvez les commandes prises et suivez leur préparation.",214,213,14,Muted);
        Text("Prenez un verre au rangement, puis dosez la boisson à la tireuse.",214,236,13,Muted);
        const bool Ordered=S.Phase==2;
        Card(214,279,864,233);Rect(234,300,57,65,0xeae7d5,9);Icon(1,251,319,0x967936);
        Text("TIREUSE",310,301,10,0x615f45);Text("Bière pression",310,325,22);Text("5,00 €",970,319,20,0x6b542a,88);
        Text(Ordered?"Une bière attendue au comptoir":S.Phase==1?"La commande n’a pas encore été prise":"Aucune commande à préparer",234,385,15);
        Line(234,415,1058,415,Rule);
        Text("INGRÉDIENT",234,436,10,Muted);Text("Bière · 50 cl",234,458,14);
        Text("RÉCIPIENT",531,436,10,Muted);Text("Pinte · 50 cl",531,458,14);
        Text("AU COMPTOIR",827,436,10,Muted);Text(std::to_string(S.Beer)+" cl disponibles",827,458,14);
        const char* Preparations[]={"Aucun verre en main","Pinte vide : rejoignez la tireuse","Versement en cours","Bière prête sur le plateau"};
        Text(Preparations[std::clamp(S.Held,0,3)],214,538,14);
        Rect(214,566,598,6,0xd8ddcf,3);const float Fill=598*static_cast<float>(std::clamp(S.Amount/50.,0.,1.));
        if(Fill>0)Rect(214,566,Fill,6,0xb5a16d,3);
        Text(std::to_string(static_cast<int>(S.Amount))+" / 50 cl",214,587,12,Muted);
        Button("return_bar","Préparer au bar",830,548,248);
    }
    else if(S.Active==Page::Register)
    {
        Rect(214,210,864,56,S.NearTill?0xdfe7d6:0xe9e2cf,4);
        Text(S.NearTill?"Vous êtes devant la caisse.":"Rejoignez la caisse derrière le bar pour encaisser.",231,230,14,S.NearTill?0x466443:0x695632);
        Card(214,286,422,91);Text("Trésorerie",232,303,12,Muted);Text(Money(S.Cash),232,330,27);
        Card(654,286,424,91);Text("Clients encaissés",672,303,12,Muted);Text(std::to_string(S.Sold),672,330,27);
        Card(214,399,864,188);Icon(2,235,423,Green);Text("Terminal de paiement",277,423,18);
        const bool Pending=S.Phase==5||S.Phase==6;
        Text(S.Phase==6?"Validation de la carte · "+std::to_string(static_cast<int>(std::ceil(S.Remaining)))+" s":S.Phase==5?"Client au guichet · 5,00 € à encaisser":S.Phase==4?"Le client rejoint la caisse":"Aucun règlement en attente",235,465,15);
        Text(Pending?"Le montant sera crédité après validation du terminal.":"Les clients règlent après avoir terminé leur boisson.",235,495,12,Muted);
        Button("pay_card","Encaisser par carte",235,533,195,S.Phase==5&&S.NearTill&&!S.Bankrupt);
        Text("Paiement sécurisé au comptoir",811,544,12,Muted);
    }
    else if(S.Active==Page::Reserve)
    {
        Text("Inventaire et réapprovisionnement du comptoir.",214,213,14,Muted);
        Card(214,255,864,235);Rect(215,256,862,46,0xe4e7db,8);Rect(215,280,862,22,0xe4e7db);
        Text("INGRÉDIENT",233,273,11,Muted);Text("AU COMPTOIR",447,273,11,Muted);
        Text("EN RÉSERVE",660,273,11,Muted);Text("APPROVISIONNEMENT",855,273,11,Muted);
        Text("Bière pression",233,331,16);Text("Lot de 500 cl",233,359,12,Muted);
        Text(std::to_string(S.Beer)+" cl",447,331,21);Text("Capacité : 1 000 cl",447,364,12,Muted);
        Text(std::to_string(S.Reserve)+" cl",660,331,21);
        Text(S.Delivery>0?"Livraison : "+std::to_string(static_cast<int>(std::ceil(S.Delivery)))+" s":"Stock disponible",660,364,12,Muted);
        Button("restock","Réapprovisionner",853,326,204,S.Reserve>0&&S.Beer<1000&&!S.Bankrupt);
        Button("buy_stock","Commander · 16,00 €",853,374,204,S.Reserve==0&&S.Delivery<=0&&S.Cash>=1600&&!S.Bankrupt);
        Line(233,427,1057,427,Rule);Text("La livraison arrive dans la réserve après 10 secondes de jeu.",233,452,13,Muted);
        Rect(214,514,864,79,0xe9e2cf,4);
        Text("Préparez le prochain service",232,530,16,0x695632);
        Text("Réapprovisionnez le comptoir avant que le stock de bière soit épuisé.",232,559,13,0x695632);
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
        Text("1 000 cl au bar · 500 cl en réserve",232,488,11,Muted);
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
