using UnrealBuildTool;

public class LePetitComptoir : ModuleRules
{
    public LePetitComptoir(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore", "ProceduralMeshComponent", "Json" });
        PrivateDependencyModuleNames.AddRange(new string[] { "Slate", "SlateCore" });
        if (Target.bBuildEditor)
            PrivateDependencyModuleNames.AddRange(new string[] { "UMG", "RenderCore", "RHI", "UnrealEd" });
    }
}
