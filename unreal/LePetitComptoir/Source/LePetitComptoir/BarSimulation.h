#pragma once
// Engine-independent service model. Money is stored in integer euro cents.
#include "DrinkCatalog.h"
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <locale>
#include <sstream>
#include <string>
#include <array>

namespace Comptoir
{
enum class Customer { None, Order, Drink, Drinking, Walking, Payment, Processing };
enum class Glass { None, Empty, Filling, Full }; // Full is accepted when migrating v1/v2 saves.
struct Guest
{
    int Id=0;
    Recipe Requested=Recipe::Beer;
    Customer Phase=Customer::None;
    double Remaining=0;
};
class Game
{
public:
    static constexpr int MaxCustomers=3,TrayCapacity=4,NightCost=3500;
    int Cash=26000,Day=1,Sold=0,NextCustomerId=1;
    bool Open=false,Closing=false,Developer=false,ClockPaused=false;
    double Time=1020,SpawnRemaining=1,Amount=0;
    Glass Held=Glass::None;
    Recipe Vessel=Recipe::Beer;
    std::array<Guest,MaxCustomers> Guests{};
    std::array<int,TrayCapacity> Tray{{-1,-1,-1,-1}};
    std::array<int,DrinkCount> Stock{{1000,150,40,12,12,12}},Reserve{{500,75,20,12,12,12}};
    std::array<double,DrinkCount> Delivery{};

    bool Bankrupt() const {return Cash<0;}
    int CustomerCount() const {int N=0;for(const auto& C:Guests)N+=C.Phase!=Customer::None;return N;}
    int TrayCount() const {int N=0;for(int R:Tray)N+=R>=0;return N;}
    int ReadyCount(Recipe R) const {return static_cast<int>(std::count(Tray.begin(),Tray.end(),static_cast<int>(R)));}
    int PendingCount(Recipe R) const {int N=0;for(const auto& C:Guests)N+=C.Phase==Customer::Drink&&C.Requested==R;return N;}
    bool HasCustomer(int Slot) const {return Slot>=0&&Slot<MaxCustomers&&Guests[Slot].Phase!=Customer::None;}
    int ProcessingSlot() const {for(int I=0;I<MaxCustomers;++I)if(Guests[I].Phase==Customer::Processing)return I;return -1;}
    int PaymentSlot() const
    {
        if(ProcessingSlot()>=0)return -1;
        int Best=-1;
        for(int I=0;I<MaxCustomers;++I)if(Guests[I].Phase==Customer::Payment&&(Best<0||Guests[I].Id<Guests[Best].Id))Best=I;
        return Best;
    }
    void SetDeveloper(bool Enabled){Developer=Enabled;if(!Enabled)ClockPaused=false;}
    bool AddTestMoney(int Euros)
    {
        if(!Developer||Euros<1||Euros>1000000||Euros>(100000000-Cash)/100)return false;
        Cash+=Euros*100;return true;
    }
    bool AddTestProgress(int Clients)
    {
        if(!Developer||Clients<1||Clients>1000||Sold>10000000-Clients)return false;
        Sold+=Clients;return true;
    }
    bool FillTestStocks()
    {
        if(!Developer)return false;
        for(int I=0;I<DrinkCount;++I){Stock[I]=Drinks[I].Capacity;Reserve[I]=Drinks[I].Pack;Delivery[I]=0;}return true;
    }
    bool ToggleTestClock(){if(!Developer)return false;ClockPaused=!ClockPaused;return true;}
    bool AdvanceTestHour()
    {
        if(!Developer||!Open||Closing||Bankrupt())return false;
        Time=std::min(1680.0,Time+60);if(Time>=1680){Closing=true;FinishIfReady();}return true;
    }
    bool ToggleService()
    {
        if(Bankrupt()||Closing)return false;
        if(!Open){Open=true;Time=1020;SpawnRemaining=1;}
        else {Closing=true;FinishIfReady();}return true;
    }
    bool TakeGlass(Recipe Choice)
    {
        if(!ValidRecipe(static_cast<int>(Choice))||Held==Glass::Filling||Bankrupt()||TrayCount()>=TrayCapacity)return false;
        Vessel=Choice;Held=Glass::Empty;Amount=0;return true;
    }
    bool Pour(Recipe Station,double Seconds)
    {
        if(!ValidRecipe(static_cast<int>(Station))||Station!=Vessel||!std::isfinite(Seconds)||Seconds<=0||Bankrupt())return false;
        const auto& R=Drink(Vessel);const int I=static_cast<int>(Vessel);
        if(Held==Glass::Empty)
        {
            if(Stock[I]<R.Use)return false;
            Stock[I]-=R.Use;Amount=0;Held=Glass::Filling; // Debit only on first pour, including across reloads.
        }
        if(Held!=Glass::Filling)return false;
        Amount=std::min(R.Target,Amount+Seconds*R.Speed);return true;
    }
    bool FinishDrink(Recipe Station)
    {
        if(Station!=Vessel||Held!=Glass::Filling||Amount<Drink(Vessel).Target)return false;
        for(int& Slot:Tray)if(Slot<0)
        {Slot=static_cast<int>(Vessel);Held=Glass::None;Amount=0;return true;}
        return false;
    }
    bool InteractCustomer(int Slot)
    {
        if(!HasCustomer(Slot)||Bankrupt())return false;
        auto& C=Guests[Slot];
        if(C.Phase==Customer::Order){C.Phase=Customer::Drink;return true;}
        if(C.Phase!=Customer::Drink)return false;
        for(int& R:Tray)if(R==static_cast<int>(C.Requested))
        {R=-1;C.Phase=Customer::Drinking;C.Remaining=8;return true;}
        return false;
    }
    bool PayCard()
    {
        const int I=PaymentSlot();if(I<0)return false;
        Guests[I].Phase=Customer::Processing;Guests[I].Remaining=3;return true;
    }
    bool Supply(Recipe Kind)
    {
        if(!ValidRecipe(static_cast<int>(Kind))||Bankrupt())return false;
        const int I=static_cast<int>(Kind);const auto& R=Drink(Kind);
        if(Reserve[I]>0&&Stock[I]<R.Capacity)
        {const int Transfer=std::min(Reserve[I],R.Capacity-Stock[I]);Stock[I]+=Transfer;Reserve[I]-=Transfer;return true;}
        if(Reserve[I]>0||Delivery[I]>0||Cash<R.PackCost)return false;
        Cash-=R.PackCost;Delivery[I]=10;return true;
    }
    bool Discard()
    {
        if(Held==Glass::None)return false;
        Held=Glass::None;Amount=0;return true;
    }
    bool DiscardTray(int Slot)
    {
        if(Slot<0||Slot>=TrayCapacity||Tray[Slot]<0)return false;
        Tray[Slot]=-1;return true;
    }
    bool Dismiss(int Slot)
    {
        if(!HasCustomer(Slot)||(Guests[Slot].Phase!=Customer::Order&&Guests[Slot].Phase!=Customer::Drink))return false;
        Guests[Slot]=Guest{};FinishIfReady();return true;
    }
    void Tick(double Seconds)
    {
        if(!std::isfinite(Seconds)||Seconds<=0||Bankrupt())return;
        for(int I=0;I<DrinkCount;++I)if(Delivery[I]>0)
        {Delivery[I]=std::max(0.0,Delivery[I]-Seconds);if(Delivery[I]==0)Reserve[I]+=Drinks[I].Pack;}
        if(!Open)return;
        if(!Developer||!ClockPaused)Time=std::min(1680.0,Time+Seconds*.5);
        if(Time>=1680)Closing=true;
        for(auto& C:Guests)
        {
            double Left=Seconds;
            while(Left>0&&(C.Phase==Customer::Drinking||C.Phase==Customer::Walking||C.Phase==Customer::Processing))
            {
                const double Used=std::min(Left,C.Remaining);C.Remaining-=Used;Left-=Used;
                if(C.Remaining>0)break;
                if(C.Phase==Customer::Drinking){C.Phase=Customer::Walking;C.Remaining=3;}
                else if(C.Phase==Customer::Walking)C.Phase=Customer::Payment;
                else {Cash=std::min(100000000,Cash+Drink(C.Requested).Price);Sold=std::min(10000000,Sold+1);C=Guest{};}
            }
        }
        if(!Closing)
        {
            SpawnRemaining=std::max(0.0,SpawnRemaining-Seconds);
            if(SpawnRemaining==0&&CustomerCount()<MaxCustomers&&NextCustomerId<10000000)
            {
                for(auto& C:Guests)if(C.Phase==Customer::None)
                {C={NextCustomerId,static_cast<Recipe>((NextCustomerId-1)%DrinkCount),Customer::Order,0};++NextCustomerId;SpawnRemaining=16;break;}
            }
        }
        FinishIfReady();
    }
    std::string Serialize() const
    {
        std::ostringstream Out;Out.imbue(std::locale::classic());
        Out<<std::setprecision(17)<<4<<' '<<Cash<<' '<<Day<<' '<<Sold<<' '<<Open<<' '<<Closing<<' '<<Developer<<' '<<ClockPaused
            <<' '<<Time<<' '<<SpawnRemaining<<' '<<NextCustomerId<<' '<<static_cast<int>(Held)<<' '<<static_cast<int>(Vessel)<<' '<<Amount;
        for(int I=0;I<DrinkCount;++I)Out<<' '<<Stock[I]<<' '<<Reserve[I]<<' '<<Delivery[I];
        for(const auto& C:Guests)Out<<' '<<C.Id<<' '<<static_cast<int>(C.Requested)<<' '<<static_cast<int>(C.Phase)<<' '<<C.Remaining;
        for(int R:Tray)Out<<' '<<R;
        return Out.str();
    }
    bool Restore(const std::string& Text)
    {
        if(Text.size()>4096)return false;
        std::istringstream In(Text);In.imbue(std::locale::classic());Game C;
        int Version=0,HeldValue=0,VesselValue=0;if(!(In>>Version))return false;
        if(Version==1||Version==2)
        {
            int Phase=0;double Remaining=0;
            if(!(In>>C.Cash>>C.Stock[0]>>C.Reserve[0]>>C.Day>>C.Sold>>C.Open>>C.Closing>>C.Time>>C.SpawnRemaining
                >>Remaining>>C.Delivery[0]>>C.Amount>>Phase>>HeldValue))return false;
            if(Version==2&&!(In>>C.Developer>>C.ClockPaused))return false;
            if(Phase<0||Phase>6||HeldValue<0||HeldValue>3)return false;
            if(Phase!=0){C.Guests[1]={1,Recipe::Beer,static_cast<Customer>(Phase),Remaining};C.NextCustomerId=2;}
            else if(Remaining!=0)return false;
            if(HeldValue==3){if(C.Amount!=50)return false;C.Tray[0]=0;HeldValue=0;C.Amount=0;}
        }
        else if(Version==3||Version==4)
        {
            if(!(In>>C.Cash>>C.Day>>C.Sold>>C.Open>>C.Closing>>C.Developer>>C.ClockPaused>>C.Time>>C.SpawnRemaining
                >>C.NextCustomerId>>HeldValue>>VesselValue>>C.Amount))return false;
            for(int I=0;I<(Version==3?3:DrinkCount);++I)if(!(In>>C.Stock[I]>>C.Reserve[I]>>C.Delivery[I]))return false;
            for(auto& Guest:C.Guests)
            {
                int R=0,P=0;if(!(In>>Guest.Id>>R>>P>>Guest.Remaining)||!ValidRecipe(R)||P<0||P>6)return false;
                Guest.Requested=static_cast<Recipe>(R);Guest.Phase=static_cast<Customer>(P);
            }
            for(int& R:C.Tray)if(!(In>>R)||R< -1||(R>=0&&!ValidRecipe(R)))return false;
        }
        else return false;
        if(HeldValue<0||HeldValue>2||!ValidRecipe(VesselValue))return false;
        C.Held=static_cast<Glass>(HeldValue);C.Vessel=static_cast<Recipe>(VesselValue);
        In>>std::ws;if(!In.eof()||!C.Valid())return false;
        *this=C;return true;
    }
private:
    void FinishIfReady()
    {
        if(!Closing||CustomerCount()!=0)return;
        Cash-=NightCost;Day=std::min(100000,Day+1);Open=false;Closing=false;
    }
    bool Valid() const
    {
        const auto Range=[](double V,double Min,double Max){return std::isfinite(V)&&V>=Min&&V<=Max;};
        if(!Range(Cash,-3500,100000000)||!Range(Day,1,100000)||!Range(Sold,0,10000000)||!Range(Time,1020,1680)
            ||!Range(SpawnRemaining,0,16)||!Range(NextCustomerId,1,10000000)||!Range(Amount,0,Drink(Vessel).Target))return false;
        if((!Open&&(Closing||CustomerCount()>0))||(Bankrupt()&&Open)||(ClockPaused&&!Developer))return false;
        if((Held==Glass::None||Held==Glass::Empty)&&Amount!=0)return false;
        for(int I=0;I<DrinkCount;++I)
            if(!Range(Stock[I],0,Drinks[I].Capacity)||!Range(Reserve[I],0,Drinks[I].Pack)||!Range(Delivery[I],0,10)
                ||(Delivery[I]>0&&Reserve[I]!=0))return false;
        int Processing=0;
        for(int I=0;I<MaxCustomers;++I)
        {
            const auto& C=Guests[I];
            if(C.Phase==Customer::None){if(C.Id!=0||C.Remaining!=0)return false;continue;}
            if(C.Id<1||C.Id>=NextCustomerId||!Range(C.Remaining,0,C.Phase==Customer::Drinking?8:3))return false;
            if((C.Phase==Customer::Order||C.Phase==Customer::Drink||C.Phase==Customer::Payment)&&C.Remaining!=0)return false;
            for(int J=0;J<I;++J)if(Guests[J].Id==C.Id)return false;
            Processing+=C.Phase==Customer::Processing;
        }
        return Processing<=1;
    }
};
}
