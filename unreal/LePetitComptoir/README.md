# Le Petit Comptoir — premier jalon Unreal

Projet C++ natif ciblant **Unreal Engine 5.8.4 sur Windows**. Il reprend une première
boucle de service du prototype JavaScript, référence
`726b07c2ee378e488dda6bf67e6f4f6ae6afdbe0`. Le prototype Electron reste à la racine du dépôt.

**État : code préparé, logique métier testée hors moteur. La compilation Unreal,
l'ouverture de la carte et le rendu restent à valider sur un poste équipé d'Unreal.**
Il ne s'agit pas du portage complet du prototype existant.

## Première ouverture sur Windows

1. Installer Unreal **5.8.4** et les outils C++ requis par cette version : Visual Studio,
   charge de travail **Développement de jeux en C++**, compilateur MSVC et Windows SDK.
   Voir [la documentation Epic](https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-visual-studio-development-environment-for-cplusplus-projects-in-unreal-engine).
2. Installer Git et Git LFS, puis ouvrir PowerShell dans le dossier où ranger le dépôt :

   ```powershell
   git lfs install
   git clone --branch migration/unreal https://github.com/MaximeBreyne/le-petit-comptoir.git
   cd le-petit-comptoir
   git lfs pull
   ```

   Si le dépôt est déjà cloné, enregistrer/committer le travail local avant de changer
   de branche, puis utiliser `git switch migration/unreal` et `git pull --ff-only`.

3. Fermer l'éditeur avant la compilation. Depuis la racine du dépôt, lancer :

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\unreal\LePetitComptoir\Scripts\Setup-Unreal.ps1 -OpenEditor
   ```

   `Bypass` ne concerne que ce processus PowerShell, pas la politique globale.
   Pour une installation située ailleurs, ajouter par exemple
   `-EngineRoot 'D:\Epic Games\UE_5.8'`.

4. Le script compile le module Editor puis crée **uniquement les assets manquants** :
   `Content/Maps/Bar.umap` et `Content/Materials/M_Bar.uasset`. Il ne remplace pas
   les cartes ou matériaux existants. Un échec arrête le script et affiche la phase concernée.
5. Ouvrir `LePetitComptoir.uproject`, puis la carte **Content/Maps/Bar** et cliquer sur **Play**.
   Le décor apparaît au lancement du jeu : il est construit par le GameMode C++.
   L'éditeur montre donc une carte presque vide avant Play. Cliquer dans la vue pour capturer la souris.

Le champ `EngineAssociation` vaut `5.8`, comme pour une installation Launcher de cette
famille ; utiliser **5.8.4** sur les deux machines pour conserver le même environnement.
Le script vérifie la version installée. Aucune licence, ressource Fab ou extension payante n'est requise.

## Démonstration jouable à valider

1. Déplacement **ZQSD ou WASD**, souris pour regarder, **Maj** pour courir.
2. Regarder le panneau **OUVERTURE** sur la gauche et appuyer sur **E**.
3. Le client apparaît après une seconde. Le regarder puis **E** pour prendre sa commande.
4. Prendre une pinte au rangement **VERRES** avec **E**.
5. Regarder la **TIREUSE**, maintenir le clic gauche pour atteindre **50 cl**, puis **E**
   pour récupérer la bière. Le versement cesse si la tireuse n'est plus visée/à portée.
6. Viser le client puis **E** pour servir. Il boit, rejoint la caisse, puis attend son règlement.
7. Viser la **CAISSE** puis **E** : les **5 €** sont crédités après trois secondes.
8. **E** sur **RESERVE** transfère la bière disponible au comptoir. Une réserve vide
   permet de commander 500 cl pour **16 €**, livrés après 10 secondes, puis à transférer.
9. **E** sur le panneau lance la dernière tournée. La fermeture attend le client présent,
   prélève **35 €** et prépare le soir suivant. Le service va de 17 h à 4 h à raison
   d'une minute de jeu toutes les deux secondes réelles.

**P** met en pause/reprend. **R**, en visant la tireuse, range le verre ou jette la
préparation (sans remboursement). **X**, en visant un client dont la commande n'est
pas encore servie, permet de la refuser. **F5** sauvegarde, **F9** recharge la dernière
sauvegarde. Dans l'éditeur, Échap arrête la session Play.

La trésorerie initiale est de **260 €**, avec **1 000 cl** au comptoir et **500 cl** en réserve.
Cette première version utilise **un seul client à la fois**, une bière et un règlement
par carte. Le dosage est plafonné à 50 cl ; qualité, pourboires, espèces avec rendu de
monnaie, plateau multi-boissons, recettes supplémentaires, employés, extensions,
tablette, animations et audio ne sont **pas encore portés**.

## Sauvegardes

La partie Unreal est enregistrée automatiquement toutes les cinq secondes et après
les actions principales. Le slot `LePetitComptoir_Unreal_Pilot_v1` est indépendant
des sauvegardes Electron : aucune conversion du `localStorage` n'est effectuée.
Dans l'éditeur, le fichier est dans `Saved/SaveGames/` ; il n'est pas envoyé à GitHub.
Les deux ordinateurs partagent le **projet**, pas automatiquement la partie en cours.

Une sauvegarde invalide suspend les écritures afin de préserver le fichier. Pour
recommencer une partie ou après une faillite, fermer le jeu, **copier ce fichier de
sauvegarde ailleurs**, puis retirer le fichier du dossier `Saved/SaveGames/`.

## Synchroniser les deux ordinateurs

Utiliser la même version d'Unreal et les mêmes outils C++ sur les deux postes. Après
le premier bootstrap, ajouter les deux assets générés : ils seront gérés par LFS.

```powershell
git lfs install
git add unreal/LePetitComptoir/Content
git commit -m "Create Unreal pilot map and material"
git push origin migration/unreal
```

Avant chaque session : fermer Unreal, `git pull --ff-only`, puis `git lfs pull`.
Après chaque session : **Save All**, fermer Unreal, vérifier les changements avec
`git status`, puis commit et push. Éviter de modifier une même carte/Blueprint sur les
deux machines sans synchroniser : ces assets binaires ne se fusionnent pas comme du code.
GitHub Desktop peut remplacer les commandes Git. Une deuxième machine doit recompiler
ses fichiers locaux ; `Binaries`, `Intermediate`, `Saved` et les caches sont ignorés.

## Architecture et validation

- `BarSimulation.h` : logique indépendante du moteur et sauvegarde versionnée.
- `ComptoirGameMode` : scène de démonstration, interactions et orchestration.
- `ComptoirCharacter` : caméra, déplacement et interactions par rayon à 3 m.
- `ComptoirProp` : objets 3D interactifs ; décor volontairement simple.
- `ComptoirHUD` : affichage provisoire Canvas ; remplacement par UMG prévu ensuite.
- `Scripts/bootstrap.py` : création de la carte et du matériau dans l'éditeur uniquement.

Tests métier sans Unreal, avec GCC ou Clang :

```sh
g++ -std=c++17 -Wall -Wextra -Werror -pedantic Tests/bar_simulation_test.cpp -o /tmp/comptoir-test
/tmp/comptoir-test
```

Ces tests couvrent le débit du stock, le crédit unique après paiement, la fermeture,
les livraisons et les sauvegardes. Ils **ne valident pas** UHT, les API Unreal, la physique,
les entrées, les scripts d'éditeur ou le rendu. Sur Windows, valider la séquence de
jeu ci-dessus, sauvegarder pendant un dosage et un paiement, fermer/réouvrir le projet,
puis vérifier que stocks et argent ne sont comptés qu'une fois. Refaire la vérification
après un clone sur le deuxième ordinateur.

Les géométries sont des primitives du moteur. Les fichiers binaires de carte et de
matériau sont créés localement par Unreal, pas simulés par des fichiers texte.

## Suite du portage

Après validation de ce jalon sous 5.8.4 : importer les catalogues de recettes et
améliorations, porter les commandes multiples et le plateau, reconstruire les interfaces
UMG, puis les employés, extensions et sauvegardes complètes. Les tests de `checks/`
restent la référence comportementale du prototype JavaScript.
