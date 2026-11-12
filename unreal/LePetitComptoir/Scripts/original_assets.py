"""Native material equivalents for the original procedural WebGL scene."""
from pathlib import Path
import unreal
from original_fonts import create_world_font


def create_original_assets():
    create_world_font()
    editing = unreal.MaterialEditingLibrary
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    folder = "/Game/Original/Materials"
    unreal.EditorAssetLibrary.make_directory(folder)
    code = (Path(__file__).parent / "original_surface.hlsl").read_text(encoding="utf-8")
    # A content fingerprint upgrades existing generated assets as well as new clones.
    # Only these 17 generated materials are rebuilt; fonts and user assets are separate.
    import hashlib
    signature = hashlib.sha256((code + Path(__file__).read_text(encoding="utf-8")).encode()).hexdigest()
    roughness = [.48, .38, .29, .87, .91, .25, .16, .5, .90, .65, .38, .08, .32, .48, .75, .92, .18]
    for index in range(17):
        name = f"M_Original_{index:02d}"
        asset_path = f"{folder}/{name}"
        material = unreal.EditorAssetLibrary.load_asset(asset_path) if unreal.EditorAssetLibrary.does_asset_exist(asset_path) else None
        if material and unreal.EditorAssetLibrary.get_metadata_tag(material, "Comptoir.SurfaceVersion") == signature:
            continue
        if material is None:
            material = tools.create_asset(name, folder, unreal.Material, unreal.MaterialFactoryNew())
        if material is None:
            raise RuntimeError(f"Creation impossible : {name}")
        editing.delete_all_material_expressions(material)
        material.set_editor_property("two_sided", True)
        material.set_editor_property("tangent_space_normal", False)
        material.set_editor_property("blend_mode", unreal.BlendMode.BLEND_TRANSLUCENT if index == 11 else unreal.BlendMode.BLEND_OPAQUE)
        if index == 11:
            material.set_editor_property("translucency_lighting_mode", unreal.TranslucencyLightingMode.TLM_SURFACE_PER_PIXEL_LIGHTING)
            material.set_editor_property("screen_space_reflections", True)

        def expression(kind, x, y):
            return editing.create_material_expression(material, kind, x, y)

        def constant(value, x, y):
            node = expression(unreal.MaterialExpressionConstant, x, y)
            node.set_editor_property("r", value)
            return node

        def connect(source, output, target, pin):
            if not editing.connect_material_expressions(source, output, target, pin):
                raise RuntimeError(f"Connexion impossible : {name}/{pin} depuis {output!r}")

        def result(node, prop, output=""):
            if not editing.connect_material_property(node, output, prop):
                raise RuntimeError(f"Sortie impossible : {name}/{prop}/{output}")

        surface = expression(unreal.MaterialExpressionCustom, -350, 50)
        vertex_normal = expression(unreal.MaterialExpressionVertexNormalWS, -1200, 300)
        interpolated_normal = expression(unreal.MaterialExpressionVertexInterpolator, -1000, 300)
        normal_pins = list(editing.get_material_expression_input_names(interpolated_normal))
        if len(normal_pins) != 1:
            raise RuntimeError(f"Entree VertexInterpolator inattendue : {normal_pins}")
        connect(vertex_normal, "", interpolated_normal, str(normal_pins[0]))
        source_nodes = {
            "Tint": expression(unreal.MaterialExpressionVertexColor, -900, 0),
            "World": expression(unreal.MaterialExpressionWorldPosition, -900, 150),
            # Explicit vertex-to-pixel interpolation: no PixelNormalWS feedback loop.
            "Normal": interpolated_normal,
            "UV": expression(unreal.MaterialExpressionTextureCoordinate, -900, 450),
            "View": expression(unreal.MaterialExpressionCameraVectorWS, -900, 600),
            "BaseRoughness": constant(roughness[index], -900, 750),
        }
        inputs = []
        for input_name in source_nodes:
            custom_input = unreal.CustomInput()
            custom_input.set_editor_property("input_name", input_name)
            inputs.append(custom_input)
        surface.set_editor_property("inputs", inputs)
        outputs = []
        for output_name, output_type in (("Roughness", unreal.CustomMaterialOutputType.CMOT_FLOAT1),
                                         ("DetailNormal", unreal.CustomMaterialOutputType.CMOT_FLOAT3),
                                         ("Occlusion", unreal.CustomMaterialOutputType.CMOT_FLOAT1),
                                         ("GlassOpacity", unreal.CustomMaterialOutputType.CMOT_FLOAT1),
                                         ("Metallic", unreal.CustomMaterialOutputType.CMOT_FLOAT1)):
            output = unreal.CustomOutput()
            output.set_editor_property("output_name", output_name)
            output.set_editor_property("output_type", output_type)
            outputs.append(output)
        surface.set_editor_property("additional_outputs", outputs)
        surface.set_editor_property("output_type", unreal.CustomMaterialOutputType.CMOT_FLOAT3)
        surface.set_editor_property("code", f"const int Surface = {index};\n" + code)
        for input_name, node in source_nodes.items():
            connect(node, "", surface, input_name)
        result(surface, unreal.MaterialProperty.MP_BASE_COLOR)
        result(surface, unreal.MaterialProperty.MP_ROUGHNESS, "Roughness")
        result(surface, unreal.MaterialProperty.MP_NORMAL, "DetailNormal")
        result(surface, unreal.MaterialProperty.MP_AMBIENT_OCCLUSION, "Occlusion")
        result(surface, unreal.MaterialProperty.MP_METALLIC, "Metallic")
        # Ordinary surfaces no longer glow. Ambient light comes from the lighting rig.
        if index in (7, 16):
            glow = expression(unreal.MaterialExpressionMultiply, -100, -150)
            connect(surface, "", glow, "A")
            glow.set_editor_property("const_b", 3.0 if index == 7 else .55)
            result(glow, unreal.MaterialProperty.MP_EMISSIVE_COLOR)
        if index == 11:
            result(surface, unreal.MaterialProperty.MP_OPACITY, "GlassOpacity")
        editing.recompile_material(material)
        unreal.EditorAssetLibrary.set_metadata_tag(material, "Comptoir.SurfaceVersion", signature)
        if not unreal.EditorAssetLibrary.save_loaded_asset(material):
            raise RuntimeError(f"Sauvegarde impossible : {name}")

    logo_path = "/Game/Original/UI/T_ComptoirLogo"
    if not unreal.EditorAssetLibrary.does_asset_exist(logo_path):
        source = Path(__file__).resolve().parents[1] / "SourceArt/Brand/logo-128.png"
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
