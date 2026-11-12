using UnrealBuildTool;
using System.Collections.Generic;

public class LePetitComptoirTarget : TargetRules
{
    public LePetitComptoirTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("LePetitComptoir");
    }
}
