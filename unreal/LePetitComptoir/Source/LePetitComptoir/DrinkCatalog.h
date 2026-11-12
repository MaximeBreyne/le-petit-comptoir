#pragma once
#include <array>

namespace Comptoir
{
enum class Recipe { Beer, Wine, Coffee };
struct DrinkInfo
{
    const char* Key;
    const char* Name;
    const char* Vessel;
    const char* Station;
    const char* Unit;
    int Price,Pack,PackCost,Capacity,Use;
    double Target,Speed;
};
inline constexpr std::array<DrinkInfo,3> Drinks={{
    {"beer","Bière pression","Pinte","Tireuse","cl",500,500,1600,1000,50,50,14},
    {"wine","Vin rouge","Verre à vin","Bouteille de vin","cl",600,75,700,150,15,15,5},
    {"coffee","Espresso","Tasse","Machine à café","ml",300,20,500,40,1,25,8}
}};
inline bool ValidRecipe(int Value){return Value>=0&&Value<static_cast<int>(Drinks.size());}
inline const DrinkInfo& Drink(Recipe Value){return Drinks[static_cast<int>(Value)];}
}
