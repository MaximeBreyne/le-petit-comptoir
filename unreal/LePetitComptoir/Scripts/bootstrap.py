"""Run through UnrealEditor-Cmd -run=pythonscript, after compiling the Editor target.

Create missing assets and upgrade the generated scene without deleting user actors.
The original scene is present in the new map before Play starts.
"""
from pathlib import Path
from datetime import datetime, timezone
import shutil
import sys
import unreal
sys.path.insert(0, str(Path(__file__).resolve().parent))
from original_assets import create_original_assets


def create_material():
    asset_path = "/Game/Materials/M_Bar"
    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        return
    unreal.EditorAssetLibrary.make_directory("/Game/Materials")
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    material = tools.create_asset("M_Bar", "/Game/Materials", unreal.Material, unreal.MaterialFactoryNew())
    if material is None:
        raise RuntimeError("Impossible de creer M_Bar")
    editing = unreal.MaterialEditingLibrary
    color = editing.create_material_expression(material, unreal.MaterialExpressionVectorParameter, -300, 0)
    color.set_editor_property("parameter_name", "Tint")
    color.set_editor_property("default_value", unreal.LinearColor(0.12, 0.28, 0.18, 1.0))
    roughness = editing.create_material_expression(material, unreal.MaterialExpressionConstant, -300, 150)
    roughness.set_editor_property("r", 0.65)
    if not editing.connect_material_property(color, "", unreal.MaterialProperty.MP_BASE_COLOR):
        raise RuntimeError("Connexion Base Color impossible")
    if not editing.connect_material_property(roughness, "", unreal.MaterialProperty.MP_ROUGHNESS):
        raise RuntimeError("Connexion Roughness impossible")
    editing.recompile_material(material)
    if not unreal.EditorAssetLibrary.save_loaded_asset(material):
        raise RuntimeError("Sauvegarde de M_Bar impossible")


def create_map():
    asset_path = "/Game/Maps/ComptoirOriginal"
    exists = unreal.EditorAssetLibrary.does_asset_exist(asset_path)
    unreal.EditorAssetLibrary.make_directory("/Game/Maps")
    editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    if exists:
        if not editor.load_level(asset_path):
            raise RuntimeError("Chargement de ComptoirOriginal impossible")
        level_actors = actors.get_all_level_actors()
        old_venues = [actor for actor in level_actors
                      if actor.actor_has_tag("OriginalVenue") and actor.get_geometry_revision() < 4]
        fix_axes = any(actor.get_geometry_revision() < 3 for actor in old_venues)
        if old_venues:
            backup = Path(unreal.Paths.project_saved_dir()) / "Backups" / "BeforeStreetUpdate"
            backup.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
            shutil.copy2(Path(unreal.Paths.project_content_dir()) / "Maps/ComptoirOriginal.umap",
                         backup / f"ComptoirOriginal-{stamp}.umap")
        changed = False
        for actor in level_actors:
            if actor in old_venues:
                if not actor.build("world", True):
                    raise RuntimeError("Mise a jour du decor et de la rue impossible")
                changed = True
            if fix_axes and actor.get_actor_label() == "Depart derriere le comptoir":
                actor.set_actor_location(unreal.Vector(155, 600, 100), False, False)
                actor.set_actor_rotation(unreal.Rotator(pitch=-3.44, yaw=0, roll=0), False)
                changed = True
        if changed and not editor.save_current_level():
            raise RuntimeError("Sauvegarde de la carte corrigee impossible")
        return
    if not editor.new_level(asset_path):
        raise RuntimeError("Creation de la carte ComptoirOriginal impossible")
    start = actors.spawn_actor_from_class(
        unreal.PlayerStart, unreal.Vector(155, 600, 100), unreal.Rotator(pitch=-3.44, yaw=0, roll=0)
    )
    if start is None:
        raise RuntimeError("Creation du PlayerStart impossible")
    start.set_actor_label("Depart derriere le comptoir")
    scene_class = unreal.load_class(None, "/Script/LePetitComptoir.ComptoirScene")
    if scene_class is None:
        raise RuntimeError("Classe ComptoirScene absente : recompiler le projet")
    venue = actors.spawn_actor_from_class(scene_class, unreal.Vector(0, 0, 0))
    if venue is None or not venue.build("world", True):
        raise RuntimeError("Import de la scene originale echoue")
    venue.set_actor_label("Decor original - Le Petit Comptoir")
    venue.set_editor_property("tags", [unreal.Name("OriginalVenue")])
    if not editor.save_current_level():
        raise RuntimeError("Sauvegarde de ComptoirOriginal impossible")


create_material()
create_original_assets()
create_map()
content = Path(unreal.Paths.project_content_dir())
for relative in ("Maps/ComptoirOriginal.umap", "Original/Materials/M_Original_00.uasset",
                 "Original/UI/T_ComptoirLogo.uasset", "Original/Fonts/F_ComptoirWorld.uasset",
                 "Original/Materials/M_ComptoirText.uasset"):
    if not (content / relative).is_file():
        raise RuntimeError(f"Asset manquant apres creation : {relative}")
unreal.log("Le Petit Comptoir : decor original pret. Ouvrir Maps/ComptoirOriginal et appuyer sur Play.")
