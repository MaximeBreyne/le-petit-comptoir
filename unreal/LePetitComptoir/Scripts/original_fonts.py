"""Offline distance-field font and matching material for 3D signs (Windows)."""
from datetime import datetime, timezone
import hashlib
from pathlib import Path
import shutil
import unreal


def create_world_font():
    assets = unreal.EditorAssetLibrary
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    editing = unreal.MaterialEditingLibrary
    folder = "/Game/Original/Fonts"
    font_path = f"{folder}/F_ComptoirWorld"
    assets.make_directory(folder)
    font = assets.load_asset(font_path) if assets.does_asset_exist(font_path) else None
    # Chars is a whitelist, not an addition to include_ascii_range. The previous
    # currency-only list produced empty rectangles for letters/digits/accents.
    # Include printable ASCII and Latin-1 explicitly, then French punctuation.
    characters = "".join(chr(code) for code in range(32, 127))
    characters += "".join(chr(code) for code in range(160, 256)) + "€ŒœŸ’‘–—…"
    signature = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    current = font is not None and unreal.ComptoirScene.prepare_world_font()
    rebuild = (not current or
               assets.get_metadata_tag(font, "Comptoir.FontVersion") != signature)
    if rebuild:
        factory = unreal.TrueTypeFontFactory()
        factory.set_editor_property("create_new", True)
        factory.set_editor_property("edit_after_new", False)
        options = factory.get_editor_property("import_options")
        data = options.get_editor_property("data")
        for key, value in {
            "font_name": "Arial", "height": 32.0, "enable_bold": True,
            "foreground_color": unreal.LinearColor(1, 1, 1, 1),
            "enable_antialiasing": True, "use_distance_field_alpha": True,
            "distance_field_scale_factor": 4, "include_ascii_range": True,
            "chars": characters, "texture_page_width": 1024,
            "texture_page_max_height": 1024,
        }.items():
            data.set_editor_property(key, value)
        options.set_editor_property("data", data)
        if font is None:
            font = tools.create_asset("F_ComptoirWorld", folder, unreal.Font, factory)
            if font is None:
                raise RuntimeError("Creation de la police des panneaux impossible")
        else:
            # Keep an on-disk copy before changing the generated asset in place.
            source = Path(unreal.Paths.project_content_dir()) / "Original/Fonts/F_ComptoirWorld"
            backup = Path(unreal.Paths.project_saved_dir()) / "Backups/BeforeFontRepair"
            backup.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
            for extension in (".uasset", ".uexp", ".ubulk"):
                original = source.with_suffix(extension)
                if original.is_file():
                    shutil.copy2(original, backup / f"F_ComptoirWorld-{stamp}{extension}")
            font.set_editor_property("import_options", data)
            if not unreal.ComptoirScene.reimport_world_font():
                raise RuntimeError("Reimport de la police impossible : lettres, chiffres, accents et € doivent etre presents. Ancien fichier conserve dans Saved/Backups/BeforeFontRepair.")
            font = assets.load_asset(font_path)
        if not unreal.ComptoirScene.prepare_world_font():
            raise RuntimeError("Atlas de police incomplet apres import : verifier les glyphes et la page de texture dans le journal.")
        assets.set_metadata_tag(font, "Comptoir.FontVersion", signature)
        if not assets.save_loaded_asset(font):
            raise RuntimeError("Sauvegarde de la police reparee impossible")
        unreal.log("Police des panneaux reconstruite : lettres, chiffres, accents et euro.")

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
