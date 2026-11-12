#if WITH_DEV_AUTOMATION_TESTS && WITH_EDITOR
#include "../ComptoirSave.h"
#include "../ComptoirGameMode.h"
#include "Misc/AutomationTest.h"
#include "Kismet/GameplayStatics.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FComptoirSessionSaveTest,"LePetitComptoir.Session.SaveMetadata",
    EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)

bool FComptoirSessionSaveTest::RunTest(const FString&)
{
    const AComptoirGameMode* Rules=GetDefault<AComptoirGameMode>();
    TestTrue(TEXT("French bar name"),Rules->IsBarNameValid(TEXT("Chez Élise")));
    TestFalse(TEXT("Blank bar name"),Rules->IsBarNameValid(TEXT("   ")));
    TestFalse(TEXT("Multiline bar name"),Rules->IsBarNameValid(TEXT("Chez\nÉlise")));
    TestFalse(TEXT("Overlong bar name"),Rules->IsBarNameValid(FString::ChrN(33,TCHAR('A'))));
    TestTrue(TEXT("Name at length limit"),Rules->IsBarNameValid(FString::ChrN(32,TCHAR('A'))));
    UComptoirSave* Original=NewObject<UComptoirSave>();
    Original->BarName=TEXT("Chez Élise");
    Comptoir::Game Game;Game.SetDeveloper(true);Game.ToggleTestClock();Game.AddTestMoney(1000);
    Game.ToggleService();Game.Tick(1);Game.Tick(16);Game.Tick(16);
    Game.InteractCustomer(0);Game.InteractCustomer(1);Game.InteractCustomer(2);
    Game.TakeGlass(Comptoir::Recipe::Wine);Game.Pour(Comptoir::Recipe::Wine,4);Game.FinishDrink(Comptoir::Recipe::Wine);
    Original->Simulation=UTF8_TO_TCHAR(Game.Serialize().c_str());
    TArray<uint8> Bytes;
    if(!TestTrue(TEXT("Serialize into memory without touching player saves"),UGameplayStatics::SaveGameToMemory(Original,Bytes)))return false;
    UComptoirSave* Loaded=Cast<UComptoirSave>(UGameplayStatics::LoadGameFromMemory(Bytes));
    if(!TestNotNull(TEXT("Deserialize save metadata"),Loaded))return false;
    TestEqual(TEXT("Venue name survives reload"),Loaded->BarName,Original->BarName);
    Comptoir::Game Restored;TestTrue(TEXT("Restore simulation"),Restored.Restore(TCHAR_TO_UTF8(*Loaded->Simulation)));
    TestTrue(TEXT("Developer settings stay with the save"),Restored.Developer&&Restored.ClockPaused&&Restored.Cash==126000);
    TestTrue(TEXT("Independent orders and ready drinks survive Unreal save"),Restored.CustomerCount()==3&&Restored.ReadyCount(Comptoir::Recipe::Wine)==1&&Restored.PendingCount(Comptoir::Recipe::Coffee)==1);
    return !HasAnyErrors();
}
#endif
