using UnrealBuildTool;
using System.Collections.Generic;

public class LePetitComptoirEditorTarget : TargetRules
{
    public LePetitComptoirEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("LePetitComptoir");
    }
}
