#include "../Source/LePetitComptoir/BarSimulation.h"
#include <cassert>
#include <iostream>
#include <limits>
#include <random>
using namespace Comptoir;
static void Prepare(Game& G,Recipe R)
{
    const int I=static_cast<int>(R),Before=G.Stock[I];
    assert(G.TakeGlass(R));assert(G.Pour(R,1));
    assert(G.Stock[I]==Before-Drink(R).Use);
    assert(!G.FinishDrink(R));
    Game Loaded;assert(Loaded.Restore(G.Serialize()));G=Loaded;
    assert(G.Pour(R,100)&&G.Stock[I]==Before-Drink(R).Use);
    assert(G.FinishDrink(R)&&G.Held==Glass::None);
    assert(!G.FinishDrink(R));
}
int main()
{
    Game G;assert(!G.PayCard());G.Tick(20);assert(G.CustomerCount()==0);
    assert(G.ToggleService());G.Tick(1);G.Tick(16);G.Tick(16);
    assert(G.CustomerCount()==3);G.Tick(100);assert(G.CustomerCount()==3&&G.NextCustomerId==4);
    for(int I=0;I<3;++I){assert(G.Guests[I].Phase==Customer::Order);assert(G.InteractCustomer(I));}
    assert(!G.InteractCustomer(-1)&&!G.InteractCustomer(3));
    // Three orders can coexist; all recipes can also be made without an order.
    Prepare(G,Recipe::Beer);Prepare(G,Recipe::Wine);Prepare(G,Recipe::Coffee);Prepare(G,Recipe::Beer);
    assert(G.TrayCount()==4&&!G.TakeGlass(Recipe::Coffee));
    assert(G.InteractCustomer(2)); // Serve out of arrival order, leaving all other drinks.
    assert(G.TrayCount()==3&&G.ReadyCount(Recipe::Beer)==2&&G.Guests[0].Phase==Customer::Drink);
    assert(G.InteractCustomer(1)&&G.InteractCustomer(0));
    assert(G.TrayCount()==1&&!G.InteractCustomer(0)&&G.Cash==26000);
    assert(G.ToggleService()&&G.Closing); // Closing must drain every customer.
    G.Tick(8);for(const auto& C:G.Guests)assert(C.Phase==Customer::Walking);
    G.Tick(3);assert(G.PaymentSlot()==0&&G.PayCard()&&!G.PayCard());
    G.Tick(2);assert(G.Cash==26000&&G.Sold==0);
    Game Loaded;assert(Loaded.Restore(G.Serialize())&&Loaded.Serialize()==G.Serialize());G=Loaded;
    G.Tick(1);assert(G.Cash==26500&&G.Sold==1&&G.Open&&G.Closing);
    assert(G.PaymentSlot()==1&&G.PayCard());G.Tick(3);assert(G.Cash==27100&&G.Open&&G.Sold==2);
    assert(G.PaymentSlot()==2&&G.PayCard());G.Tick(100);
    assert(G.Cash==23900&&G.Sold==3&&!G.Open&&G.Day==2); // 500+600+300 minus 3500 once.
    G.Tick(100);assert(G.Cash==23900&&!G.PayCard());
    assert(G.TrayCount()==1&&G.DiscardTray(3)&&!G.DiscardTray(3));

    Game Wrong;Prepare(Wrong,Recipe::Wine);assert(Wrong.ToggleService());Wrong.Tick(1);assert(Wrong.InteractCustomer(0));
    const auto Unserved=Wrong.Serialize();assert(!Wrong.InteractCustomer(0)&&Wrong.Serialize()==Unserved);
    assert(Wrong.TakeGlass(Recipe::Coffee));const auto Stock=Wrong.Stock;
    assert(!Wrong.Pour(Recipe::Beer,2)&&Wrong.Stock==Stock); // Wrong glass cannot drink the wrong stock.
    assert(Wrong.TakeGlass(Recipe::Beer)); // Freely replace an empty vessel, without stock use.
    assert(Wrong.Pour(Recipe::Beer,1)&&!Wrong.TakeGlass(Recipe::Wine));
    assert(Wrong.Discard()&&Wrong.Stock[0]==950); // Already poured stock is not refunded.
    Wrong.Stock[0]=49;assert(Wrong.TakeGlass(Recipe::Beer)&&!Wrong.Pour(Recipe::Beer,1));
    assert(Wrong.Discard());

    for(int I=0;I<DrinkCount;++I)
    {
        const auto R=static_cast<Recipe>(I);Game Supply;Supply.Reserve[I]=0;Supply.Stock[I]=0;
        assert(Supply.Supply(R)&&Supply.Cash==26000-Drinks[I].PackCost&&!Supply.Supply(R));
        Supply.Tick(9);assert(Supply.Reserve[I]==0);Supply.Tick(1);assert(Supply.Reserve[I]==Drinks[I].Pack);
        Supply.Tick(20);assert(Supply.Reserve[I]==Drinks[I].Pack);
        assert(Supply.Supply(R)&&Supply.Stock[I]==Drinks[I].Pack&&Supply.Reserve[I]==0);
        Supply.Cash=Drinks[I].PackCost-1;assert(!Supply.Supply(R));
        Supply.Stock[I]=Drinks[I].Capacity-1;Supply.Reserve[I]=Drinks[I].Pack;
        assert(Supply.Supply(R)&&Supply.Stock[I]==Drinks[I].Capacity&&Supply.Reserve[I]==Drinks[I].Pack-1);
    }
    Game Parallel;for(int I=0;I<3;++I){Parallel.Reserve[I]=0;assert(Parallel.Supply(static_cast<Recipe>(I)));}
    assert(Parallel.Cash==23200);Parallel.Tick(10);assert((Parallel.Reserve==std::array<int,DrinkCount>{{500,75,20,12,12,12}}));

    for(int I=3;I<DrinkCount;++I){Game Cold;const auto R=static_cast<Recipe>(I);
        assert(IsCold(R)&&Cold.TakeGlass(R));assert(!Cold.Pour(Recipe::Beer,4));
        assert(Cold.Pour(R,1)&&Cold.Stock[I]==11);Game Reload;assert(Reload.Restore(Cold.Serialize()));
        assert(Reload.Pour(R,4)&&Reload.Stock[I]==11&&Reload.FinishDrink(R));
        assert(Reload.ReadyCount(R)==1&&Reload.Supply(R)&&Reload.Stock[I]==12&&Reload.Reserve[I]==11);
    }
    // An actual three-drink v3 payload migrates with its progress and new fridge defaults.
    Game V3;assert(V3.Restore("3 26000 1 0 0 0 0 0 1020 1 1 0 0 0 1000 500 0 150 75 0 40 20 0 0 0 0 0 0 0 0 0 0 0 0 0 -1 -1 -1 -1"));
    assert(V3.Cash==26000&&V3.Stock[3]==12&&V3.Reserve[5]==12);
    assert(V3.Restore("3 28400 3 7 1 0 0 0 1100 8 9 2 1 5 900 250 0 120 0 4 38 20 0 5 0 6 2 6 1 2 0 8 2 5 0 1 0 -1 -1"));
    assert(V3.CustomerCount()==3&&V3.ProcessingSlot()==0&&V3.TrayCount()==2&&V3.Vessel==Recipe::Wine&&V3.Amount==5);
    V3.Tick(2);assert(V3.Cash==28900&&V3.Sold==8&&V3.Delivery[1]==2);
    assert(V3.Pour(Recipe::Wine,2)&&V3.Stock[1]==120&&V3.FinishDrink(Recipe::Wine)&&V3.ReadyCount(Recipe::Wine)==2);
    Game ColdOrders;ColdOrders.NextCustomerId=4;assert(ColdOrders.ToggleService());ColdOrders.Tick(1);ColdOrders.Tick(16);ColdOrders.Tick(16);
    for(int I=0;I<3;++I){assert(ColdOrders.Guests[I].Requested==static_cast<Recipe>(I+3));assert(ColdOrders.InteractCustomer(I));Prepare(ColdOrders,static_cast<Recipe>(I+3));}
    for(int I=2;I>=0;--I)assert(ColdOrders.InteractCustomer(I));
    assert(ColdOrders.ToggleService());ColdOrders.Tick(8);ColdOrders.Tick(3);
    for(int I=0;I<3;++I){assert(ColdOrders.PayCard());ColdOrders.Tick(3);}
    assert(ColdOrders.Sold==3&&ColdOrders.Cash==23500&&!ColdOrders.Open); // 3 + 3.50 + 3.50 - 35 euros.
    // Migrate old single-customer saves without losing a beer or repeating payment.
    Game Legacy;
    assert(Legacy.Restore("1 26000 950 500 1 0 1 0 1020 0 0 0 50 2 3"));
    assert(Legacy.Guests[1].Phase==Customer::Drink&&Legacy.ReadyCount(Recipe::Beer)==1&&Legacy.Held==Glass::None);
    assert(Legacy.InteractCustomer(1));
    assert(Legacy.Restore("2 26000 950 500 1 0 1 1 1020 0 2 0 0 6 0 1 1"));
    assert(Legacy.Developer&&Legacy.ClockPaused&&Legacy.ProcessingSlot()==1);
    Legacy.Tick(2);assert(Legacy.Cash==23000&&Legacy.Sold==1&&!Legacy.Open);
    Legacy.Tick(2);assert(Legacy.Cash==23000);
    assert(Legacy.Restore("2 26000 950 500 1 0 0 0 1020 1 0 0 14 0 2 0 0"));
    assert(Legacy.Pour(Recipe::Beer,3)&&Legacy.Stock[0]==950&&Legacy.FinishDrink(Recipe::Beer));
    const auto Good=Legacy.Serialize();
    for(const std::string& Bad:{std::string(""),std::string("garbage"),Good+" trailing",std::string("2"),std::string("4 ")+Good})
    {assert(!Legacy.Restore(Bad)&&Legacy.Serialize()==Good);}
    for(double Dt:{-1.,0.,std::numeric_limits<double>::infinity(),std::numeric_limits<double>::quiet_NaN()})
    {Legacy.Tick(Dt);assert(!Legacy.Pour(Recipe::Beer,Dt)&&Legacy.Serialize()==Good);}
    Game Invalid;Invalid.Amount=1;assert(!Legacy.Restore(Invalid.Serialize()));
    Invalid=Game();Invalid.Guests[0]={1,Recipe::Beer,Customer::Order,0};Invalid.NextCustomerId=2;
    assert(!Legacy.Restore(Invalid.Serialize())); // Closed service cannot contain customers.
    Invalid.Open=true;Invalid.Guests[1]=Invalid.Guests[0];assert(!Legacy.Restore(Invalid.Serialize()));
    Invalid=Game();Invalid.ClockPaused=true;assert(!Legacy.Restore(Invalid.Serialize()));
    Invalid=Game();Invalid.Tray[0]=7;assert(!Legacy.Restore(Invalid.Serialize()));

    Game Dev;assert(!Dev.AddTestMoney(1000)&&!Dev.AddTestProgress(25)&&!Dev.FillTestStocks());
    assert(!Dev.ToggleTestClock()&&!Dev.AdvanceTestHour());Dev.SetDeveloper(true);
    assert(Dev.AddTestMoney(1000)&&Dev.Cash==126000&&Dev.Sold==0);
    assert(!Dev.AddTestMoney(-1)&&!Dev.AddTestMoney(1000001));
    assert(Dev.AddTestProgress(25)&&Dev.Sold==25&&!Dev.AddTestProgress(1001));
    Dev.Reserve[0]=0;assert(Dev.Supply(Recipe::Beer));const int Paid=Dev.Cash;
    assert(Dev.FillTestStocks());Dev.Tick(20);assert(Dev.Reserve[0]==500&&Dev.Cash==Paid);
    assert(Dev.ToggleTestClock()&&!Dev.AdvanceTestHour());assert(Dev.ToggleService());Dev.Tick(1);
    assert(Dev.Time==1020&&Dev.AdvanceTestHour()&&Dev.Time==1080);
    assert(Loaded.Restore(Dev.Serialize())&&Loaded.Developer&&Loaded.ClockPaused);Loaded.SetDeveloper(false);
    Loaded.Tick(2);assert(Loaded.Time==1081);
    Dev.Time=1679;assert(Dev.AdvanceTestHour()&&Dev.Closing&&!Dev.AdvanceTestHour());assert(Dev.Dismiss(0)&&!Dev.Open);
    Dev.Cash=100000000;assert(!Dev.AddTestMoney(1));Dev.Sold=10000000;assert(!Dev.AddTestProgress(1));

    Game Night;assert(Night.ToggleService());Night.Tick(1320);assert(!Night.Open&&Night.Cash==22500);
    Night.Cash=100;assert(Night.ToggleService());Night.Tick(1);assert(Night.ToggleService()&&Night.Dismiss(0));
    assert(Night.Bankrupt()&&!Night.Open&&!Night.ToggleService());
    // Exercise mixed orders, stocks, tray changes, refusals and saves over many evenings.
    Game Stress;std::mt19937 Random(93467);Stress.SetDeveloper(true);Stress.ToggleTestClock();
    for(int Step=0;Step<20000;++Step)
    {
        const int I=Random()%3;const auto R=static_cast<Recipe>(Random()%DrinkCount);
        switch(Random()%12)
        {
            case 0:Stress.ToggleService();break;case 1:Stress.Tick(Random()%18+1);break;
            case 2:Stress.TakeGlass(R);break;case 3:Stress.Pour(R,3);break;
            case 4:Stress.FinishDrink(R);break;case 5:Stress.InteractCustomer(I);break;
            case 6:Stress.PayCard();break;case 7:Stress.Supply(R);break;
            case 8:Stress.Discard();break;case 9:Stress.DiscardTray(Random()%4);break;
            case 10:Stress.Dismiss(I);break;case 11:Stress.FillTestStocks();Stress.AddTestMoney(100);break;
        }
        Game RoundTrip;assert(RoundTrip.Restore(Stress.Serialize())&&RoundTrip.Serialize()==Stress.Serialize());
    }
    std::cout<<"PASS: concurrent orders, correct glasses, four-place tray, per-recipe stocks, payment queue, v1/v2/v3 migration, cold drink service and 20000 mixed save round trips\n";
}
