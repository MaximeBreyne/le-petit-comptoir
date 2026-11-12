using UnrealBuildTool;

public class LePetitComptoir : ModuleRules
{
    public LePetitComptoir(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore", "ProceduralMeshComponent", "Json" });
    }
}
