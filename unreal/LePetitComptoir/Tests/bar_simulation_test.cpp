#include "../Source/LePetitComptoir/BarSimulation.h"
#include <cassert>
#include <iostream>
#include <limits>

using namespace Comptoir;

static void Prepare(Game& G)
{
    assert(G.TakeGlass());
    assert(G.Pour(2));
    assert(G.Beer == 950);
    assert(!G.TakeBeer());
    assert(G.Pour(2));
    assert(G.Beer == 950); // No second stock deduction.
    assert(G.Amount == 50);
    assert(G.TakeBeer());
}

int main()
{
    // Full service: the money is received only after card confirmation.
    Game G;
    assert(G.Cash == 26000 && G.Reserve == 500 && G.Day == 1);
    assert(!G.PayCard());
    G.Tick(20);
    assert(G.Phase == Customer::None);
    assert(G.ToggleService());
    G.Tick(1);
    assert(G.Phase == Customer::Order);
    assert(G.InteractCustomer());
    Prepare(G);
    assert(G.InteractCustomer());
    assert(G.Cash == 26000);
    G.Tick(8);
    assert(G.Phase == Customer::Walking && !G.PayCard());
    G.Tick(3);
    assert(G.Phase == Customer::Payment);
    assert(G.PayCard() && !G.PayCard());
    G.Tick(2);
    assert(G.Cash == 26000 && G.Sold == 0);
    const auto Pending = G.Serialize();
    Game Restored;
    assert(Restored.Restore(Pending));
    assert(Restored.Serialize() == Pending);
    Restored.Tick(1);
    assert(Restored.Cash == 26500 && Restored.Sold == 1);
    Restored.Tick(1);
    assert(Restored.Cash == 26500 && !Restored.PayCard());

    // Closing drains an active client, and charges exactly once.
    assert(G.ToggleService() && G.Closing);
    assert(!G.ToggleService());
    G.Tick(1);
    assert(!G.Open && !G.Closing && G.Cash == 23000 && G.Day == 2 && G.Sold == 1);
    G.Tick(100);
    assert(G.Cash == 23000);
    assert(G.ToggleService() && G.Time == 1020);

    // Supplies move between locations; a paid pack arrives once, not immediately.
    Game Stock;
    Stock.Reserve = 0;
    Stock.Beer = 200;
    assert(Stock.Supply());
    assert(Stock.Cash == 24400 && Stock.Reserve == 0);
    assert(!Stock.Supply());
    Stock.Tick(9);
    assert(Stock.Reserve == 0);
    Stock.Tick(1);
    assert(Stock.Reserve == 500);
    Stock.Tick(20);
    assert(Stock.Reserve == 500);
    assert(Stock.Supply() && Stock.Beer == 700 && Stock.Reserve == 0);
    Stock.Cash = 1599;
    assert(!Stock.Supply());
    Stock.Beer = 990; Stock.Reserve = 500;
    assert(Stock.Supply() && Stock.Beer == 1000 && Stock.Reserve == 490);

    // Saving partway through preparation must not debit the ingredients twice.
    Game Pouring;
    assert(Pouring.TakeGlass() && Pouring.Pour(1));
    Game Loaded;
    assert(Loaded.Restore(Pouring.Serialize()));
    assert(Loaded.Pour(3) && Loaded.Beer == 950 && Loaded.Amount == 50);
    assert(Loaded.TakeBeer() && !Loaded.TakeBeer());
    assert(Loaded.Discard() && Loaded.Beer == 950 && !Loaded.Discard());
    Loaded.Beer = 49;
    assert(Loaded.TakeGlass() && !Loaded.Pour(1) && Loaded.Beer == 49);

    // Bad snapshots never modify the live game; invalid deltas have no effect.
    const auto Good = Restored.Serialize();
    for (const std::string& Bad : {std::string(""), std::string("garbage"), Good + " trailing", std::string("2")})
    {
        assert(!Restored.Restore(Bad));
        assert(Restored.Serialize() == Good);
    }
    for (double Dt : {-1.0, 0.0, std::numeric_limits<double>::infinity(), std::numeric_limits<double>::quiet_NaN()})
    {
        Restored.Tick(Dt);
        assert(!Restored.Pour(Dt));
        assert(Restored.Serialize() == Good);
    }
    Game Invalid;
    Invalid.Amount = 50; // Cannot have liquid with no glass.
    assert(!Restored.Restore(Invalid.Serialize()));
    Invalid = Game(); Invalid.Phase = Customer::Order; // Closed bar with active client.
    assert(!Restored.Restore(Invalid.Serialize()));

    // End of night, refusal, insolvency and long frames.
    Game Night;
    assert(Night.ToggleService());
    Night.Tick(1320);
    assert(!Night.Open && Night.Cash == 22500 && Night.Day == 2);
    Night.Cash = 100;
    assert(Night.ToggleService()); Night.Tick(1);
    assert(Night.ToggleService() && Night.Closing);
    assert(Night.Dismiss());
    assert(Night.Bankrupt() && !Night.Open && !Night.ToggleService());
    Game Overshoot;
    assert(Overshoot.ToggleService()); Overshoot.Tick(1);
    assert(Overshoot.InteractCustomer()); Prepare(Overshoot);
    assert(Overshoot.InteractCustomer()); Overshoot.Tick(11);
    assert(Overshoot.Phase == Customer::Payment);
    assert(Overshoot.PayCard()); Overshoot.Tick(10);
    assert(Overshoot.Sold == 1 && Overshoot.Cash == 26500);

    std::cout << "PASS: service, single payment, closing, supply, save/restore, validation and timing\n";
}
