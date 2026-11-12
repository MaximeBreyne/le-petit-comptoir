#include "../Source/LePetitComptoir/Tests/ComptoirCaptureSequence.h"
#include <cassert>
#include <iostream>
#include <set>

int main()
{
    using ComptoirCaptureSequence::Sequence;
    Sequence Run;
    int Model=-1,Captures=0,Reads=0;
    std::uint64_t Frame=100;
    std::set<std::uint64_t> CapturedFrames;
    for(int Level:{0,4,8})
    {
        Run.Add([&,Level]{Model=Level;Captures=0;CapturedFrames.clear();});
        Run.Add([&,Level]{assert(Model==Level);++Captures;CapturedFrames.insert(Frame);},24);
        Run.Add([&]{assert(Captures==24);assert(CapturedFrames.size()==24);++Reads;});
    }
    bool Done=false;
    for(;Frame<200&&!Done;++Frame)
    {
        Done=Run.Update(Frame);
        const int Before=Captures,BeforeReads=Reads,BeforeModel=Model;
        for(int Poll=0;Poll<30;++Poll)assert(Run.Update(Frame)==Done);
        assert(Captures==Before&&Reads==BeforeReads&&Model==BeforeModel);
    }
    assert(Done&&Reads==3&&Frame==178);
    assert(Run.Update(200));
    Sequence Failed;
    bool Unexpected=false;
    Failed.Add([&]{Failed.Stop();});
    Failed.Add([&]{Unexpected=true;});
    assert(Failed.Update(0)&&Failed.Update(1)&&!Unexpected);
    Sequence Empty;
    assert(Empty.Update(0));
    std::cout<<"PASS: 24 distinct engine frames per capture, ordered readback, and safe abort.\n";
}
