#pragma once
#include <cstddef>
#include <cstdint>
#include <functional>
#include <utility>
#include <vector>

namespace ComptoirCaptureSequence
{
// Automation can poll a latent command more than once in an engine frame.
// Count only distinct frames so the engine can process deferred render work.
class Sequence
{
    struct Step { int Remaining; std::function<void()> Run; };
    std::vector<Step> Steps;
    std::size_t Next=0;
    std::uint64_t LastFrame=0;
    bool Started=false,Stopped=false;
public:
    void Add(std::function<void()> Run,int Frames=1)
    {
        if(Frames>0)Steps.push_back({Frames,std::move(Run)});
    }
    void Stop(){Stopped=true;}
    bool Update(std::uint64_t Frame)
    {
        if(Stopped||Next==Steps.size())return true;
        if(Started&&Frame==LastFrame)return false;
        Started=true;LastFrame=Frame;
        Step& Current=Steps[Next];
        Current.Run();
        if(--Current.Remaining==0)++Next;
        return Stopped||Next==Steps.size();
    }
};
}
