#pragma once

namespace ComptoirSession
{
enum class Screen { Playing, Home, Pause, NewGame, Load, Save, Settings, Confirm };
struct Flow
{
    Screen View=Screen::Home;
    Screen ReturnView=Screen::Home;
    void Open(Screen Next){ReturnView=HasSession?Screen::Pause:Screen::Home;View=Next;}
    void Back(){View=ReturnView;}
    bool HasSession=false,HasSave=false,CanContinue=false;
    bool MenuVisible() const { return View!=Screen::Playing; }
    bool CanSimulate() const { return HasSession&&!MenuVisible(); }
    bool CanSave() const { return HasSession; }
    void Started() { HasSession=true;View=Screen::Playing; }
    void Pause() { if(CanSimulate())View=Screen::Pause; }
    void Resume() { if(HasSession&&View==Screen::Pause)View=Screen::Playing; }
    // The caller saves successfully before leaving a live session.
    void Home() { HasSession=false;View=Screen::Home; }
    void RequestNew() { if(View==Screen::Home)View=Screen::NewGame; }
    void CancelNew() { if(View==Screen::NewGame)View=Screen::Home; }
};
}
