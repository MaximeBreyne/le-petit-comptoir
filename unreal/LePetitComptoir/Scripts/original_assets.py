"""Native material equivalents for the original procedural WebGL scene."""
from pathlib import Path
import unreal


def create_original_assets():
    editing = unreal.MaterialEditingLibrary
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    folder = "/Game/Original/Materials"
    unreal.EditorAssetLibrary.make_directory(folder)
    code = (Path(__file__).parent / "original_surface.hlsl").read_text(encoding="utf-8")
    roughness = [.65, .46, .38, .96, .96, .23, .14, .5, .94, .68, .48, .09, .34, .52, .82, .97]
    for index in range(16):
        name = f"M_Original_{index:02d}"
        if unreal.EditorAssetLibrary.does_asset_exist(f"{folder}/{name}"):
            # Migrate only the coordinate conversion in our generated shader.
            material = unreal.EditorAssetLibrary.load_asset(f"{folder}/{name}")
            changed = False
            for node in editing.get_material_expressions(material):
                if isinstance(node, unreal.MaterialExpressionCustom):
                    current = node.get_editor_property("code")
                    old_axes = "float3 world=World.xzy*.01, n=Normal.xzy;"
                    if "struct ComptoirNoise" in current and old_axes in current:
                        node.set_editor_property("code", current.replace(
                            old_axes, "float3 world=World.yzx*.01, n=Normal.yzx;"))
                        changed = True
            if changed:
                editing.recompile_material(material)
                if not unreal.EditorAssetLibrary.save_loaded_asset(material):
                    raise RuntimeError(f"Mise a jour impossible : {name}")
            continue
        material = tools.create_asset(name, folder, unreal.Material, unreal.MaterialFactoryNew())
        if material is None:
            raise RuntimeError(f"Creation impossible : {name}")
        material.set_editor_property("two_sided", True)
        if index == 11:
            material.set_editor_property("blend_mode", unreal.BlendMode.BLEND_TRANSLUCENT)

        def expression(kind, x, y):
            return editing.create_material_expression(material, kind, x, y)

        def constant(value, x, y):
            node = expression(unreal.MaterialExpressionConstant, x, y)
            node.set_editor_property("r", value)
            return node

        def connect(source, output, target, pin):
            if not editing.connect_material_expressions(source, output, target, pin):
                outputs = list(editing.get_material_expression_output_names(source))
                inputs = list(editing.get_material_expression_input_names(target))
                raise RuntimeError(
                    f"Connexion impossible : {name}/{pin}; sortie demandee={output!r}, "
                    f"sorties disponibles={outputs!r}, entrees disponibles={inputs!r}"
                )

        def result(node, prop):
            if not editing.connect_material_property(node, "", prop):
                raise RuntimeError(f"Sortie impossible : {name}/{prop}")

        tint = expression(unreal.MaterialExpressionVertexColor, -700, 0)
        position = expression(unreal.MaterialExpressionWorldPosition, -700, 150)
        normal = expression(unreal.MaterialExpressionPixelNormalWS, -700, 300)
        surface = expression(unreal.MaterialExpressionCustom, -350, 50)
        # CustomInput's generated Python constructor takes no arguments in UE 5.8.
        inputs = []
        for input_name in ("Tint", "World", "Normal"):
            custom_input = unreal.CustomInput()
            custom_input.set_editor_property("input_name", input_name)
            inputs.append(custom_input)
        surface.set_editor_property("inputs", inputs)
        surface.set_editor_property("output_type", unreal.CustomMaterialOutputType.CMOT_FLOAT3)
        surface.set_editor_property("code", f"const int Surface = {index};\n" + code)
        # Select the first color output; its channel label is not an API pin name.
        connect(tint, "", surface, "Tint")
        connect(position, "", surface, "World")
        connect(normal, "", surface, "Normal")
        result(surface, unreal.MaterialProperty.MP_BASE_COLOR)
        result(constant(roughness[index], -200, 250), unreal.MaterialProperty.MP_ROUGHNESS)
        result(constant(.65 if index == 5 else 0, -200, 350), unreal.MaterialProperty.MP_METALLIC)
        # A little ambient bounce matches the old renderer without the pilot's ceiling hotspots.
        glow = expression(unreal.MaterialExpressionMultiply, -100, -150)
        connect(surface, "", glow, "A")
        glow.set_editor_property("const_b", 1.8 if index == 7 else .12)
        result(glow, unreal.MaterialProperty.MP_EMISSIVE_COLOR)
        if index == 11:
            result(constant(.16, -200, 450), unreal.MaterialProperty.MP_OPACITY)
        editing.recompile_material(material)
        if not unreal.EditorAssetLibrary.save_loaded_asset(material):
            raise RuntimeError(f"Sauvegarde impossible : {name}")

    logo_path = "/Game/Original/UI/T_ComptoirLogo"
    if not unreal.EditorAssetLibrary.does_asset_exist(logo_path):
        source = Path(__file__).resolve().parents[3] / "dist/assets/brand/logo-128.png"
        if not source.is_file():
            raise RuntimeError(f"Logo original introuvable : {source}")
        task = unreal.AssetImportTask()
        for key, value in {"filename": str(source), "destination_path": "/Game/Original/UI",
                           "destination_name": "T_ComptoirLogo", "automated": True, "save": True,
                           "replace_existing": False}.items():
            task.set_editor_property(key, value)
        tools.import_asset_tasks([task])
        if not unreal.EditorAssetLibrary.does_asset_exist(logo_path):
            raise RuntimeError("Import du logo original echoue")
