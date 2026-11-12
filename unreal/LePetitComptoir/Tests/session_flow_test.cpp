#include "../Source/LePetitComptoir/SessionFlow.h"
#include "../Source/LePetitComptoir/BarSimulation.h"
#include <cassert>
#include <iostream>

int main()
{
    using namespace ComptoirSession;
    Flow F;Comptoir::Game Game;
    assert(F.View==Screen::Home&&!F.CanSimulate()&&!F.CanSave());
    const auto Original=Game.Serialize();
    for(int I=0;I<100;++I)if(F.CanSimulate())Game.Tick(10);
    assert(Game.Serialize()==Original); // Waiting at home cannot advance/autosave a new game.
    F.RequestNew();assert(F.View==Screen::NewGame&&!F.CanSave());
    F.CancelNew();assert(F.View==Screen::Home&&!F.HasSession);
    F.HasSave=true;F.RequestNew();assert(F.View==Screen::NewGame);
    F.Started();assert(F.CanSimulate()&&F.CanSave());
    assert(Game.ToggleService());
    F.Pause();assert(F.View==Screen::Pause&&!F.CanSimulate()&&F.CanSave());
    F.Resume();assert(F.CanSimulate());
    F.Open(Screen::Load);assert(!F.CanSimulate()&&F.CanSave());F.Back();assert(F.View==Screen::Pause);
    F.Home();assert(!F.CanSave()&&!F.CanSimulate());
    F.Resume();assert(F.View==Screen::Home&&!F.HasSession);
    std::cout<<"PASS: home/new/pause/resume transitions and save/simulation gating\n";
}
