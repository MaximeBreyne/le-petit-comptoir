# Sources du décor

Ces fichiers restent nécessaires pour régénérer et contrôler le décor Unreal :

- `Scene/engine.js` fournit les catalogues, les couleurs et l’état initial utilisés par les générateurs.
- `Scene/scene.js` et `Scene/venue.js` construisent le décor et les modèles.
- `Scene/renderer.js` sert de référence indépendante au test de géométrie.
- `Brand/logo-128.png` est la source du logo importé dans Unreal.

Depuis la racine du dépôt :

```sh
node unreal/LePetitComptoir/Scripts/export-original-scene.cjs
node unreal/LePetitComptoir/Tests/original_scene_test.cjs
```

Aucun paquet npm n’est requis. Le résultat `Content/OriginalData/scene.json` est
versionné et lu par C++ ; le jeu ne charge aucun JavaScript. Les anciennes pages,
interfaces, lanceurs et dépendances Electron ont été supprimés. Pour consulter
leur implémentation, utiliser l’historique Git avant ce nettoyage.
