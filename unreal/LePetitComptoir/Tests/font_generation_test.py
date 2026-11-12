"""Portable font-upgrade workflow checks; the real importer/rendering needs Unreal.

Model the reported broken atlas (only the explicit currency/punctuation whitelist)
and exercise the actual Python generator with an in-memory Unreal API stand-in.
"""
import importlib.util
import json
from pathlib import Path
import re
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
FONT = '/Game/Original/Fonts/F_ComptoirWorld'
MATERIAL = '/Game/Original/Materials/M_ComptoirText'
REQUIRED = re.search(r'Glyphs=TEXT\("([^"]+)"\)',
                    (ROOT / 'Source/LePetitComptoir/ComptoirText.h').read_text()).group(1)


class Object:
    def __init__(self, **properties):
        self.properties = properties
        self.metadata = {}
        self.glyphs = set()

    def get_editor_property(self, name):
        return self.properties[name]

    def set_editor_property(self, name, value):
        self.properties[name] = value


class FontSample(Object):
    pass


class FontEnvironment:
    def __init__(self, directory, existing=False):
        self.content = directory / 'Content'
        self.saved = directory / 'Saved'
        self.file = self.content / 'Original/Fonts/F_ComptoirWorld.uasset'
        self.assets = {}
        self.sample = FontSample()
        self.creates = self.reimports = 0
        self.fail_import = False
        self.reimport_backups = []
        if existing:
            font = Object(import_options=Object(chars='€ŒœŸ’‘–—…'))
            font.glyphs = set('€ŒœŸ’‘–—…')
            self.assets[FONT] = font
            self.file.parent.mkdir(parents=True)
            self.file.write_bytes(b'original font package')
        library = types.SimpleNamespace(
            make_directory=lambda _: None, does_asset_exist=lambda p: p in self.assets,
            load_asset=lambda p: self.assets[p], save_loaded_asset=self.save,
            get_metadata_tag=lambda obj, tag: obj.metadata.get(tag, ''),
            set_metadata_tag=lambda obj, tag, value: obj.metadata.__setitem__(tag, value),
            duplicate_asset=self.duplicate)
        editing = types.SimpleNamespace(get_material_expressions=lambda _: [self.sample],
                                        recompile_material=lambda _: None)
        self.api = types.SimpleNamespace(
            EditorAssetLibrary=library, MaterialEditingLibrary=editing,
            AssetToolsHelpers=types.SimpleNamespace(get_asset_tools=lambda: self),
            TrueTypeFontFactory=lambda: Object(import_options=Object(data=Object())),
            Font=Object, LinearColor=lambda *args: args,
            MaterialExpressionFontSample=FontSample,
            ComptoirScene=types.SimpleNamespace(prepare_world_font=self.usable,
                                               reimport_world_font=self.reimport),
            Paths=types.SimpleNamespace(project_content_dir=lambda: str(self.content),
                                        project_saved_dir=lambda: str(self.saved)),
            log=lambda _: None)

    def usable(self):
        font = self.assets.get(FONT)
        return font is not None and set(REQUIRED) <= font.glyphs

    def create_asset(self, name, folder, kind, factory):
        assert f'{folder}/{name}' == FONT and FONT not in self.assets
        self.creates += 1
        data = factory.get_editor_property('import_options').get_editor_property('data')
        font = Object(import_options=data)
        font.glyphs = set(data.get_editor_property('chars')) if not self.fail_import else set()
        self.assets[FONT] = font
        return font

    def reimport(self):
        self.reimports += 1
        self.reimport_backups = list((self.saved / 'Backups/BeforeFontRepair').glob('*.uasset'))
        assert self.reimport_backups, 'Back up the old package before reimporting'
        if self.fail_import:
            return False
        font = self.assets[FONT]
        font.glyphs = set(font.get_editor_property('import_options').get_editor_property('chars'))
        return self.usable()

    def duplicate(self, source, target):
        self.assets[target] = Object()
        return self.assets[target]

    def save(self, asset):
        if asset is self.assets.get(FONT):
            self.file.parent.mkdir(parents=True, exist_ok=True)
            self.file.write_bytes(b'rebuilt font package')
        return True

    def run(self):
        with patch.dict(sys.modules, {'unreal': self.api}):
            spec = importlib.util.spec_from_file_location('font_generator', ROOT / 'Scripts/original_fonts.py')
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.create_world_font()


class FontGenerationTest(unittest.TestCase):
    def test_fresh_font_covers_actual_signs_and_ascii(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = FontEnvironment(Path(tmp))
            env.run()
            font = env.assets[FONT]
            self.assertTrue(env.usable())
            self.assertTrue(set(map(chr, range(32, 127))) <= font.glyphs)
            scene = json.loads((ROOT / 'Content/OriginalData/scene.json').read_text())
            for collection in scene['collections'].values():
                for shape in collection:
                    self.assertTrue(set(shape.get('label', '').replace('\n', '')) <= font.glyphs)
            self.assertIs(env.sample.get_editor_property('font'), font)
            self.assertEqual(env.sample.get_editor_property('font_texture_page'), 0)
            env.run()
            self.assertEqual((env.creates, env.reimports), (1, 0), 'Reuse a valid up-to-date font')

    def test_existing_incomplete_font_is_backed_up_and_rebuilt_in_place(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = FontEnvironment(Path(tmp), existing=True)
            original = env.assets[FONT]
            env.run()
            self.assertIs(env.assets[FONT], original, 'Retain asset identity and references')
            self.assertTrue(env.usable())
            self.assertEqual((env.creates, env.reimports), (0, 1))
            self.assertEqual(env.reimport_backups[0].read_bytes(), b'original font package')
            env.run()
            self.assertEqual(env.reimports, 1)
            # Even a matching fingerprint must not hide damaged/missing glyphs.
            original.glyphs.remove('9')
            env.run()
            self.assertEqual(env.reimports, 2)
            self.assertTrue(env.usable())

    def test_failed_reimport_preserves_disk_package_and_does_not_mark_success(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = FontEnvironment(Path(tmp), existing=True)
            env.fail_import = True
            with self.assertRaisesRegex(RuntimeError, 'Reimport de la police impossible'):
                env.run()
            self.assertEqual(env.file.read_bytes(), b'original font package')
            self.assertNotIn('Comptoir.FontVersion', env.assets[FONT].metadata)


if __name__ == '__main__':
    unittest.main()
