"""Offline distance-field font and matching material for 3D signs (Windows)."""
import unreal


def create_world_font():
    assets = unreal.EditorAssetLibrary
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    editing = unreal.MaterialEditingLibrary
    folder = "/Game/Original/Fonts"
    font_path = f"{folder}/F_ComptoirWorld"
    assets.make_directory(folder)
    font = assets.load_asset(font_path) if assets.does_asset_exist(font_path) else None
    if font is None:
        # TextRender needs an offline atlas, including the currency glyph. A
        # runtime Slate font cannot replace it. Arial is supplied with Windows.
        factory = unreal.TrueTypeFontFactory()
        factory.set_editor_property("create_new", True)
        factory.set_editor_property("edit_after_new", False)
        options = factory.get_editor_property("import_options")
        data = options.get_editor_property("data")
        for key, value in {
            "font_name": "Arial", "height": 32.0, "enable_bold": True,
            "enable_antialiasing": True, "use_distance_field_alpha": True,
            "distance_field_scale_factor": 4, "include_ascii_range": True,
            "chars": "€ŒœŸ’‘–—…", "texture_page_width": 1024,
            "texture_page_max_height": 1024,
        }.items():
            data.set_editor_property(key, value)
        options.set_editor_property("data", data)
        font = tools.create_asset("F_ComptoirWorld", folder, unreal.Font, factory)
        if font is None or not assets.save_loaded_asset(font):
            raise RuntimeError("Creation de la police des panneaux impossible")

    # TextRender's UVs and the material must sample the SAME atlas. Merely
    # changing TextRender.Font leaves the default Roboto atlas in the shader.
    material_path = "/Game/Original/Materials/M_ComptoirText"
    assets.make_directory("/Game/Original/Materials")
    material = assets.load_asset(material_path) if assets.does_asset_exist(material_path) else None
    if material is None:
        material = assets.duplicate_asset(
            "/Engine/EngineMaterials/DefaultTextMaterialOpaque", material_path)
    if material is None:
        raise RuntimeError("Creation du materiau de texte impossible")
    samples = [node for node in editing.get_material_expressions(material)
               if isinstance(node, unreal.MaterialExpressionFontSample)]
    if not samples:
        raise RuntimeError("Le materiau des panneaux ne contient aucun echantillon de police")
    for node in samples:
        node.set_editor_property("font", font)
        node.set_editor_property("font_texture_page", 0)
    editing.recompile_material(material)
    if not assets.save_loaded_asset(material):
        raise RuntimeError("Sauvegarde du materiau de texte impossible")
