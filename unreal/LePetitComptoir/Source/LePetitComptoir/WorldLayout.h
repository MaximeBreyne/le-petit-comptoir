#pragma once
#include <cmath>
#include <algorithm>

// Centimetres in Unreal coordinates: X runs from the reserve to the street.
namespace ComptoirWorld
{
inline bool InReserve(double X,double Y,double Z)
{return X>=-390&&X< -35&&Y>=30&&Y<=430&&Z>40&&Z<250;}
inline bool CanRestorePosition(double X,double Y,double Z)
{
    return std::isfinite(X)&&std::isfinite(Y)&&std::isfinite(Z)&&Z>45&&Z<220&&
        ((X>30&&X<960&&Y>30&&Y<1170)||InReserve(X,Y,Z)||
         (X>=-35&&X<=30&&Y>55&&Y<135)||
         (X>=950&&X<1850&&Y> -2470&&Y<3470));
}
inline bool BlocksDoorClosing(double X,double Y)
{return X>955&&X<1210&&Y>420&&Y<780;}
inline double Wrap(double Distance,double Start,double End)
{const double Length=End-Start;return Start+std::fmod(std::fmod(Distance-Start,Length)+Length,Length);}
inline double PavementX(double Y,bool Opposite)
{
    if(Opposite)return 1785;
    // Walk around the outward-opening door leaves; keep a clear entrance.
    const double Detour=std::clamp((330-std::abs(Y-600))/160.,0.,1.);
    return 1080+105*Detour;
}
inline bool TrafficMustStop(double CarY,double LaneX,int Direction,double PlayerX,double PlayerY)
{
    const double Ahead=(PlayerY-CarY)*Direction;
    return std::abs(PlayerX-LaneX)<145&&Ahead> -210&&Ahead<650;
}
}
