#pragma once

// Engine-independent pilot model. Monetary values are integer euro cents.
// Reference: SourceArt/Scene/engine.js at 726b07c2ee378e488dda6bf67e6f4f6ae6afdbe0.
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <locale>
#include <sstream>
#include <string>

namespace Comptoir
{
enum class Customer { None, Order, Drink, Drinking, Walking, Payment, Processing };
enum class Glass { None, Empty, Filling, Full };

class Game
{
public:
    static constexpr int BeerPrice = 500;
    static constexpr int PackCost = 1600;
    static constexpr int NightCost = 3500;
    int Cash = 26000;
    int Beer = 1000;
    int Reserve = 500;
    int Day = 1;
    int Sold = 0;
    bool Open = false;
    bool Closing = false;
    bool Developer = false;
    bool ClockPaused = false;
    double Time = 1020;
    double SpawnRemaining = 1;
    double CustomerRemaining = 0;
    double DeliveryRemaining = 0;
    double Amount = 0;
    Customer Phase = Customer::None;
    Glass Held = Glass::None;

    bool Bankrupt() const { return Cash < 0; }
    void SetDeveloper(bool Enabled) { Developer=Enabled; if(!Enabled)ClockPaused=false; }
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
        Beer=1000;Reserve=500;DeliveryRemaining=0;return true;
    }
    bool ToggleTestClock()
    {
        if(!Developer)return false;
        ClockPaused=!ClockPaused;return true;
    }
    bool AdvanceTestHour()
    {
        if(!Developer||!Open||Closing||Bankrupt())return false;
        Time=std::min(1680.0,Time+60);
        if(Time>=1680){Closing=true;FinishIfReady();}
        return true;
    }
    bool ToggleService()
    {
        if (Bankrupt() || Closing) return false;
        if (!Open) { Open = true; Time = 1020; SpawnRemaining = 1; }
        else { Closing = true; FinishIfReady(); }
        return true;
    }
    bool TakeGlass()
    {
        if (Held != Glass::None || Bankrupt()) return false;
        Held = Glass::Empty;
        return true;
    }
    bool Pour(double Seconds)
    {
        if (!std::isfinite(Seconds) || Seconds <= 0 || Bankrupt()) return false;
        if (Held == Glass::Empty)
        {
            if (Beer < 50) return false;
            Beer -= 50;  // Deduct once, even after releasing/reloading.
            Amount = 0;
            Held = Glass::Filling;
        }
        if (Held != Glass::Filling) return false;
        Amount = std::min(50.0, Amount + Seconds * 14.0);
        return true;
    }
    bool TakeBeer()
    {
        if (Held != Glass::Filling || Amount < 50.0) return false;
        Held = Glass::Full;
        return true;
    }
    bool InteractCustomer()
    {
        if (Phase == Customer::Order) { Phase = Customer::Drink; return true; }
        if (Phase != Customer::Drink || Held != Glass::Full) return false;
        Held = Glass::None;
        Amount = 0;
        Phase = Customer::Drinking;
        CustomerRemaining = 8;
        return true;
    }
    bool PayCard()
    {
        if (Phase != Customer::Payment) return false;
        Phase = Customer::Processing;
        CustomerRemaining = 3;
        return true;
    }
    bool Supply()
    {
        if (Bankrupt()) return false;
        if (Reserve > 0 && Beer < 1000)
        {
            const int Transfer = std::min(Reserve, 1000 - Beer);
            Beer += Transfer;
            Reserve -= Transfer;
            return true;
        }
        if (Reserve > 0 || DeliveryRemaining > 0 || Cash < PackCost) return false;
        Cash -= PackCost;
        DeliveryRemaining = 10;
        return true;
    }
    bool Discard()
    {
        if (Held == Glass::None) return false;
        Held = Glass::None;
        Amount = 0;
        return true;
    }
    bool Dismiss()
    {
        if (Phase != Customer::Order && Phase != Customer::Drink) return false;
        Phase = Customer::None;
        SpawnRemaining = 16;
        FinishIfReady();
        return true;
    }
    void Tick(double Seconds)
    {
        if (!std::isfinite(Seconds) || Seconds <= 0 || Bankrupt()) return;
        if (DeliveryRemaining > 0)
        {
            DeliveryRemaining = std::max(0.0, DeliveryRemaining - Seconds);
            if (DeliveryRemaining == 0) Reserve += 500;
        }
        if (!Open) return;
        if(!Developer||!ClockPaused)Time = std::min(1680.0, Time + Seconds * 0.5);
        if (Time >= 1680) Closing = true;
        if (Phase == Customer::None && !Closing)
        {
            SpawnRemaining -= Seconds;
            if (SpawnRemaining <= 0) { Phase = Customer::Order; SpawnRemaining = 0; }
        }
        else if (Phase == Customer::Drinking || Phase == Customer::Walking || Phase == Customer::Processing)
        {
            // Consume overshoot without skipping or repeating a payment.
            double Remaining = Seconds;
            while (Remaining > 0 && (Phase == Customer::Drinking || Phase == Customer::Walking || Phase == Customer::Processing))
            {
                const double Used = std::min(Remaining, CustomerRemaining);
                CustomerRemaining -= Used;
                Remaining -= Used;
                if (CustomerRemaining > 0) break;
                if (Phase == Customer::Drinking) { Phase = Customer::Walking; CustomerRemaining = 3; }
                else if (Phase == Customer::Walking) { Phase = Customer::Payment; }
                else { Cash += BeerPrice; ++Sold; Phase = Customer::None; SpawnRemaining = 16; }
            }
        }
        FinishIfReady();
    }
    std::string Serialize() const
    {
        std::ostringstream Out;
        Out.imbue(std::locale::classic());
        Out << std::setprecision(17) << 2 << ' ' << Cash << ' ' << Beer << ' ' << Reserve << ' '
            << Day << ' ' << Sold << ' ' << Open << ' ' << Closing << ' ' << Time << ' '
            << SpawnRemaining << ' ' << CustomerRemaining << ' ' << DeliveryRemaining << ' '
            << Amount << ' ' << static_cast<int>(Phase) << ' ' << static_cast<int>(Held)
            << ' ' << Developer << ' ' << ClockPaused;
        return Out.str();
    }
    bool Restore(const std::string& Text)
    {
        if (Text.size() > 1024) return false;
        std::istringstream In(Text);
        In.imbue(std::locale::classic());
        Game Candidate;
        int Version = 0, PhaseValue = 0, GlassValue = 0;
        if (!(In >> Version >> Candidate.Cash >> Candidate.Beer >> Candidate.Reserve >> Candidate.Day
            >> Candidate.Sold >> Candidate.Open >> Candidate.Closing >> Candidate.Time >> Candidate.SpawnRemaining
            >> Candidate.CustomerRemaining >> Candidate.DeliveryRemaining >> Candidate.Amount >> PhaseValue >> GlassValue)) return false;
        if(Version==2 && !(In >> Candidate.Developer >> Candidate.ClockPaused))return false;
        In >> std::ws;
        if (!In.eof() || (Version != 1 && Version != 2) || PhaseValue < 0 || PhaseValue > 6 || GlassValue < 0 || GlassValue > 3) return false;
        Candidate.Phase = static_cast<Customer>(PhaseValue);
        Candidate.Held = static_cast<Glass>(GlassValue);
        if (!Candidate.Valid()) return false;
        *this = Candidate;
        return true;
    }
private:
    void FinishIfReady()
    {
        if (!Closing || Phase != Customer::None) return;
        Cash -= NightCost;
        ++Day;
        Open = false;
        Closing = false;
    }
    bool Valid() const
    {
        const auto Range = [](double V, double Min, double Max) { return std::isfinite(V) && V >= Min && V <= Max; };
        if (!Range(Cash, -3500, 100000000) || !Range(Beer, 0, 1000) || !Range(Reserve, 0, 500)
            || !Range(Day, 1, 100000) || !Range(Sold, 0, 10000000) || !Range(Time, 1020, 1680)
            || !Range(SpawnRemaining, 0, 16) || !Range(CustomerRemaining, 0, 8)
            || !Range(DeliveryRemaining, 0, 10) || !Range(Amount, 0, 50)) return false;
        if ((!Open && (Closing || Phase != Customer::None)) || (Bankrupt() && Open)) return false;
        if ((Held == Glass::None || Held == Glass::Empty) && Amount != 0) return false;
        if (Held == Glass::Full && Amount != 50) return false;
        if (DeliveryRemaining > 0 && Reserve != 0) return false;
        if (ClockPaused && !Developer) return false;
        if ((Phase == Customer::None || Phase == Customer::Order || Phase == Customer::Drink || Phase == Customer::Payment) && CustomerRemaining != 0) return false;
        if ((Phase == Customer::Walking || Phase == Customer::Processing) && CustomerRemaining > 3) return false;
        return true;
    }
};
}
