"""Run through UnrealEditor-Cmd -run=pythonscript, after compiling the Editor target.

Create only missing assets. Existing maps/materials are never overwritten.
The scene is built by the native game mode when Play starts.
"""
from pathlib import Path
import unreal


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
    asset_path = "/Game/Maps/Bar"
    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        return
    unreal.EditorAssetLibrary.make_directory("/Game/Maps")
    editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    if not editor.new_level(asset_path):
        raise RuntimeError("Creation de la carte Bar impossible")
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    start = actors.spawn_actor_from_class(
        unreal.PlayerStart, unreal.Vector(0, -350, 100), unreal.Rotator(pitch=0, yaw=90, roll=0)
    )
    if start is None:
        raise RuntimeError("Creation du PlayerStart impossible")
    start.set_actor_label("Depart derriere le comptoir")
    if not editor.save_current_level():
        raise RuntimeError("Sauvegarde de Bar impossible")


create_material()
create_map()
content = Path(unreal.Paths.project_content_dir())
for relative in ("Maps/Bar.umap", "Materials/M_Bar.uasset"):
    if not (content / relative).is_file():
        raise RuntimeError(f"Asset manquant apres creation : {relative}")
unreal.log("Le Petit Comptoir : carte et materiau prets. Ouvrir Maps/Bar et appuyer sur Play.")
