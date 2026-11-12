# Le Petit Comptoir — portage Unreal

Projet natif C++ pour **Unreal Engine 5.8.4 sur Windows**. Le prototype JavaScript
original reste à la racine du dépôt, dans `dist/`.

Le décor du premier pilote était une approximation trop simplifiée. Cette version
reprend les **5 230 éléments de la scène originale d'une nouvelle partie** : salle,
comptoir, réserve, vitrines, rue, mobilier, bouteilles, équipements et enseignes.
Les clients et les verres reprennent également leur géométrie d'origine. Le logo,
la palette et la disposition compacte de l'interface sont repris du prototype.
La tablette retrouve son boîtier paysage arrondi, son écran clair et sa navigation
latérale : Service, À préparer, Caisse et Réserve sont utilisables. Les rubriques
Bâtiment, Décoration, Licences et Équipe sont visibles mais désactivées.
Les textes utilisent la police de jeu standard du HUD, avec une position alignée
sur les pixels. Le rendu avec la police Slate introduit précédemment a été retiré
après un affichage sans aucun caractère dans Unreal. Les tailles agrandies,
les contrastes renforcés et les boutons plus hauts sont conservés.

**La migration fonctionnelle reste partielle** : une bière, un client à la fois,
paiement par carte, stocks, fermeture et sauvegarde. Les autres recettes, employés,
extensions, commandes multiples et menus complets du prototype ne sont pas encore
portés. La géométrie est vérifiée par comparaison avec le moteur original ;
**la nouvelle compilation Unreal, les matériaux et le rendu doivent être validés
sur un poste équipé du moteur**. Un test de géométrie ne valide pas une image finale.

## Mettre à jour un projet déjà installé

Fermer Unreal et conserver les éventuelles modifications locales avant la mise à jour.
Depuis la racine du dépôt dans le terminal de VS Code, exécuter une ligne à la fois :

```powershell
git switch migration/unreal
git pull --ff-only origin migration/unreal
git lfs pull
powershell -ExecutionPolicy Bypass -File .\unreal\LePetitComptoir\Scripts\Setup-Unreal.ps1 -OpenEditor
```

Arrêter si une commande échoue. Le script recompile le module, crée les nouveaux
matériaux, importe le logo existant et crée la carte **Content/Maps/ComptoirOriginal**.
Ouvrir cette carte puis cliquer sur **Play**. Le décor est aussi présent dans l'éditeur
avant Play. Le script corrige aussi les axes du décor `ComptoirOriginal` déjà créé
et les coordonnées utilisées par ses matériaux. Avant cette correction, une copie
de la carte est conservée dans `Saved/Backups/BeforeAxisFix/`. Les autres acteurs de
la carte et l'ancienne carte `Bar` sont conservés. Les matériaux peuvent demander
une compilation de shaders. Il n'est pas nécessaire de supprimer la carte.

## Première installation sur Windows

1. Installer Unreal **5.8.4** et Visual Studio Community stable avec les charges de
   travail **Développement Desktop en C++** et **Développement de jeux en C++**.
   Pour UE 5.8, Epic recommande MSVC **14.50** et Windows SDK **10.0.26100** ou plus récent.
   [Documentation Epic](https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-visual-studio-development-environment-for-cplusplus-projects-in-unreal-engine).
   VS Code peut rester l'éditeur de code utilisé au quotidien.
2. Installer Git et Git LFS puis récupérer la branche :

   ```powershell
   git lfs install
   git clone --branch migration/unreal https://github.com/MaximeBreyne/le-petit-comptoir.git
   cd le-petit-comptoir
   git lfs pull
   ```

3. Fermer Unreal, puis lancer le script présenté ci-dessus depuis le dossier contenant
   `package.json` et `unreal`. Pour un moteur installé ailleurs, ajouter par exemple
   `-EngineRoot 'D:\Epic Games\UE_5.8'`.
4. Ouvrir **Content/Maps/ComptoirOriginal** puis **Play**. Cliquer dans la vue pour capturer
   la souris. Les ouvertures suivantes se font avec `LePetitComptoir.uproject`.

Le script utilise `ExecutionPolicy Bypass` uniquement pour ce processus PowerShell.
Il vérifie la version du moteur et s'arrête en cas d'échec. `EngineAssociation` vaut
`5.8`, comme pour une installation Launcher ; utiliser **5.8.4** sur les deux postes.
Les plugins Python, Editor Scripting Utilities et Procedural Mesh Component sont ceux
fournis avec Unreal. Aucun plugin payant n'est nécessaire.

## Repères et commandes

Le départ est celui du jeu d'origine : derrière le comptoir, face à la vitrine.
La tireuse est à gauche, les verres sur le meuble derrière vous, la caisse à gauche
sur le comptoir. En vous retournant vers le meuble du fond, la porte de la réserve
se trouve à droite, comme dans le jeu original.

1. **ZQSD / WASD** : marcher. **Souris** : regarder. **Maj** : courir.
2. **Tab** : ouvrir la tablette. Cliquer sur **Ouvrir le bar**, puis revenir au bar avec
   **Tab** ou **Ranger**. Les onglets changent de page ; la prise de commande et
   l'encaissement restent limités à la proximité du client/de la caisse. Le panneau suspendu dans la porte vitrée fonctionne
   aussi avec **E**. Le service continue pendant l'utilisation de la tablette.
3. Regarder le client au comptoir puis **E** pour prendre sa commande.
4. **E** sur le rangement des verres pour prendre une pinte.
5. Regarder la tireuse, maintenir le **clic gauche** jusqu'à **50 cl**, puis **E** pour
   récupérer la bière. Le versement cesse si la tireuse n'est plus visée/à portée.
6. **E** sur le client pour servir. Il boit, puis rejoint la caisse.
7. **E** sur la caisse : les **5 €** sont crédités après trois secondes.
8. Dans la tablette, transférer la bière de réserve vers le comptoir. Une réserve vide
   permet de commander **500 cl pour 16 €**, livrés après dix secondes. La réserve
   physique permet également cette interaction avec **E**.
9. Le panneau ou la tablette lance la dernière tournée. La fermeture attend le client,
   prélève **35 €** et prépare le soir suivant. Le service va de 17 h à 4 h, une minute
   de jeu toutes les deux secondes réelles.

**P** : pause/reprise. **R** en visant la tireuse : ranger/jeter le verre sans remboursement.
**X** en visant un client non encore servi : refuser la commande. **F5** : sauvegarder.
**F9** : charger. Dans l'éditeur, **Échap** arrête Play.

## Ce qui est repris visuellement

- Les dimensions, positions, orientations, cylindres effilés et ellipsoïdes des fichiers
  `dist/scene.js` et `dist/venue.js`, avec les catalogues et couleurs de `dist/engine.js`.
- La réserve, la rue, les enseignes, les tables rondes, les chaises, les six tabourets,
  la tireuse, la machine à café, les bouteilles, le terminal et la verrerie.
- Les modèles originaux du client assis/debout et de la pinte vide/pleine.
- La caméra d'origine : hauteur 1,68 m et champ de vision vertical de 75 degrés,
  converti en champ horizontal selon le format de la fenêtre Unreal.
- Le logo original et les panneaux de service/préparation compacts. La tablette native
  donne accès aux fonctions déjà portées ; ce n'est pas encore toute l'interface d'origine.

Les motifs procéduraux de bois, parquet, carrelage et brique sont adaptés aux matériaux
Unreal. L'éclairage et la transparence utilisent le nouveau moteur et ne sont pas garantis
identiques pixel par pixel. Les modèles ont leur détail procédural d'origine ; ils ne sont
pas remplacés par des ressources externes. Le client utilise deux poses fixes pendant ce jalon.

Le décor exporté correspond à **une nouvelle partie**. Les achats de décoration ou
extensions d'une sauvegarde Electron ne sont pas importés automatiquement. La scène est
regroupée dans un acteur de géométrie procédurale ; les accessoires ne sont pas encore
convertis en assets individuels éditables comme des Blueprints.

## Sauvegardes et deux ordinateurs

Le slot Unreal `LePetitComptoir_Unreal_Pilot_v1` reste indépendant du `localStorage`
Electron. La partie est enregistrée toutes les cinq secondes et après les actions
principales. Les anciennes sauvegardes du pilote conservent leur argent, stock et service ;
leur position est replacée au départ du décor original. Les sauvegardes du décor
inversé (révision 2) sont converties vers le nouveau repère (révision 3) : position et
orientation sont conservées par rapport au mobilier. Les nouvelles sauvegardes
mémorisent la position dans la salle ou la réserve.

`Saved/SaveGames/` n'est pas envoyé à GitHub : les deux PC partagent le projet,
pas automatiquement la partie en cours. En cas de sauvegarde invalide, les écritures
sont suspendues pour la préserver. Pour recommencer, fermer le jeu, copier le fichier
ailleurs puis le retirer de `Saved/SaveGames/`.

Après la préparation sur un poste, les nouveaux assets peuvent être partagés avec LFS :

```powershell
git add unreal/LePetitComptoir/Content
git commit -m "Generate original Unreal scene and materials"
git push origin migration/unreal
```

Avant chaque session : fermer Unreal, `git pull --ff-only`, `git lfs pull`.
Après chaque session : **Save All**, fermer Unreal, vérifier `git status`, puis commit/push.
Éviter de modifier une même carte ou un même Blueprint sur les deux PC sans synchroniser.
Chaque machine recompile ses propres fichiers ; caches et fichiers de compilation sont ignorés.

## Export et vérifications

Le fichier `Content/OriginalData/scene.json` est généré par :

```sh
node unreal/LePetitComptoir/Scripts/export-original-scene.cjs
```

Il contient les empreintes SHA-256 des trois sources originales. Cet export est committé :
Node n'est pas nécessaire pour ouvrir le projet Unreal. Les matériaux et le logo sont
créés par `Scripts/original_assets.py`. La migration des axes ne modifie que la
conversion de coordonnées dans les shaders générés et le décor procédural identifié.

Depuis la racine du dépôt, avec Node et GCC/Clang :

```sh
node unreal/LePetitComptoir/Tests/original_scene_test.cjs
g++ -std=c++17 -Wall -Wextra -Werror -pedantic unreal/LePetitComptoir/Tests/bar_simulation_test.cpp -o /tmp/comptoir-test
/tmp/comptoir-test
g++ -std=c++17 -Wall -Wextra -Werror -pedantic unreal/LePetitComptoir/Tests/tablet_layout_test.cpp -o /tmp/comptoir-tablet-test
/tmp/comptoir-tablet-test
```

Le premier test compare **446 676 positions et normales** de 5 422 formes (décor,
clients et verres) à la sortie réelle du renderer JavaScript. Il vérifie la fraîcheur
de l'export, le sol de la réserve et les collisions des objets solides. La projection
à l'écran est comparée dans cinq directions de caméra pour détecter les effets miroir.
Le second teste service, stock, paiement unique, fermeture et sauvegardes. Le troisième
contrôle 140 mises en page de tablette : dimensions, zones cliquables sans chevauchement,
disponibilité des actions, taille de texte minimale dans le repère de la tablette et
contraste texte/fond d'au moins 4,5:1. Le boîtier et les quatre pages sont inspectables via
les commandes de dessin partagées avec Unreal ; ce contrôle ne remplace pas Play.

À vérifier dans Unreal : compilation UHT/C++, compilation des matériaux, absence de
surfaces noires, visibilité du logo et des enseignes, passage vers la réserve, service
complet, netteté des textes, tablette/retour souris, sauvegarde/reprise et comportement sur le deuxième PC.
Ces points nécessitent une exécution du moteur et ne sont pas couverts par les tests hors moteur.
