#include "../Source/LePetitComptoir/WorldLayout.h"
#include <cassert>
#include <iostream>
#include <limits>

int main()
{
    using namespace ComptoirWorld;
    assert(InReserve(-200,230,90));
    assert(!InReserve(155,600,90));
    assert(!InReserve(-200,600,90));
    assert(!InReserve(-200,230,400));
    for(const auto X:{-200.,0.,155.,1002.,1400.,1785.})
        assert(CanRestorePosition(X,X<=0?100:600,90));
    assert(!CanRestorePosition(100,4000,90));
    assert(!CanRestorePosition(2200,600,90));
    assert(!CanRestorePosition(-200,900,90));
    assert(!CanRestorePosition(600,600,-100));
    assert(!CanRestorePosition(std::numeric_limits<double>::quiet_NaN(),600,90));
    assert(BlocksDoorClosing(1100,600));
    assert(!BlocksDoorClosing(850,600));
    assert(!BlocksDoorClosing(1100,300));
    assert(Wrap(-11,-10,10)==9);
    assert(Wrap(10,-10,10)==-10);
    assert(Wrap(71,-10,10)==-9);
    assert(PavementX(600,false)>1002+145+30); // Keep pedestrian off open leaves.
    assert(PavementX(-1000,false)==1080);
    assert(PavementX(600,true)==1785);
    assert(TrafficMustStop(0,1350,1,1350,600));
    assert(!TrafficMustStop(0,1350,1,1100,600));
    assert(!TrafficMustStop(0,1350,1,1350,-500));
    assert(TrafficMustStop(0,1500,-1,1500,-600));
    assert(TrafficMustStop(0,1500,-1,1500,0));
    assert(!TrafficMustStop(0,1500,-1,1500,500));
    std::cout<<"PASS: reserve, outdoor saves, door clearance, pedestrian routes and both traffic directions\n";
}
