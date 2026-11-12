# Le Petit Comptoir — portage Unreal

Projet natif C++ pour **Unreal Engine 5.8.4 sur Windows**. Les seules sources JavaScript conservées sont les générateurs du décor et leur
référence de géométrie, dans `SourceArt/Scene/`. Le jeu fonctionne nativement sous Unreal.

Le décor du premier pilote était une approximation trop simplifiée. Cette version
reprend les **5 228 éléments de la scène originale d'une nouvelle partie** : salle,
comptoir, réserve, vitrines, rue, mobilier, bouteilles, équipements et enseignes.
Les clients et les verres reprennent également leur géométrie d'origine. Le logo,
la palette et la disposition compacte de l'interface sont repris du prototype.
La tablette retrouve son boîtier paysage arrondi, son écran clair et sa navigation
latérale : Service, À préparer, Caisse, Réserve et Développeur sont utilisables. Les rubriques
Bâtiment, Décoration, Licences et Équipe sont visibles mais désactivées.
La tablette est un widget **Slate ajouté directement au viewport**. Les caractères
sont rasterisés à leur taille d'affichage, avec le DPI de la fenêtre ; les icônes et
contours arrondis sont dessinés par Slate avec anticrénelage. L'interface ne passe
plus par la police bitmap du HUD ni par une texture agrandie. Les tailles agrandies,
les contrastes renforcés et les boutons plus hauts sont conservés. Les clics utilisent
la géométrie du widget, y compris lorsque la fenêtre est redimensionnée.

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
avant Play. Le script met à jour le décor `ComptoirOriginal` déjà créé : porte, sols de la rue,
réfrigérateur et police des panneaux, avec les accents et le symbole €. Avant la
migration, une copie de la carte est conservée dans `Saved/Backups/BeforeTextRepair/`.
La correction des anciens axes n’est rejouée que pour les cartes qui en ont besoin. Les autres acteurs de
la carte et l'ancienne carte `Bar` sont conservés. Les matériaux peuvent demander
une compilation de shaders. Il n'est pas nécessaire de supprimer la carte.

Pour vérifier le nouveau rendu de la tablette sur le PC qui possède Unreal, ajouter
`-VerifyTablet` au script (une carte graphique est nécessaire) :

```powershell
powershell -ExecutionPolicy Bypass -File .\unreal\LePetitComptoir\Scripts\Setup-Unreal.ps1 -VerifyTablet -OpenEditor
```

Cette option exécute `LePetitComptoir.Tablet.RenderedText` dans Unreal avant d'ouvrir
l'éditeur. Le test compare les pixels réellement rendus avec et sans texte sur les
cinq pages et les trois menus ; il échoue si les caractères ou les titres ne sont pas visibles.
Il enregistre les captures `Saved/Tests/Tablet/Tablet-0.bmp` à `Tablet-7.bmp` et un
rapport dans `Saved/Tests/TabletReport-…`. Il vérifie la présence des textes, pas leur
netteté visuelle : vérifier aussi la tablette en Play, les cinq onglets, les clics,
le retour au jeu avec Tab et le redimensionnement de la fenêtre. Sans cette option,
le fonctionnement habituel du script reste identique.

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
   `README.md` et `unreal`. Pour un moteur installé ailleurs, ajouter par exemple
   `-EngineRoot 'D:\Epic Games\UE_5.8'`.
4. Ouvrir **Content/Maps/ComptoirOriginal** puis **Play**. Choisir **Continuer** ou
   **Nouvelle partie** dans l’accueil. Les ouvertures suivantes se font avec `LePetitComptoir.uproject`.

Le script utilise `ExecutionPolicy Bypass` uniquement pour ce processus PowerShell.
Il vérifie la version du moteur et s'arrête en cas d'échec. `EngineAssociation` vaut
`5.8`, comme pour une installation Launcher ; utiliser **5.8.4** sur les deux postes.
Les plugins Python, Editor Scripting Utilities et Procedural Mesh Component sont ceux
fournis avec Unreal. Aucun plugin payant n'est nécessaire.

## Accueil, nom du bar et développeur

Le jeu ouvre désormais l’accueil, en Play dans l’éditeur comme en lancement autonome.
Le bar reste figé et aucune sauvegarde n’est écrite avant de commencer ou continuer.
**Continuer** est actif uniquement si la sauvegarde est lisible. **Nouvelle partie**
ouvre une saisie du nom du bar (1 à 32 caractères, accents acceptés). La validation
remplace la sauvegarde automatique existante ; le formulaire le signale et permet
**Annuler**. Les anciennes sauvegardes conservent le nom **Le Petit Comptoir**.

Le nom choisi apparaît sur la devanture, sur l’enseigne du fond, dans la tablette et
le HUD. Il suit la sauvegarde, sans modifier le nom du projet Unreal. **P** ouvre
un menu de pause avec Reprendre, Sauvegarder, Retour à l’accueil et Retour au bureau.
Le retour à l’accueil et la sortie sauvegardent d’abord la partie ; en cas d’échec,
le menu reste ouvert. Dans PIE, Échap reste la commande Unreal d’arrêt du jeu.

**Tab → Développeur → Activer** donne accès à :

- argent de test : +100 €, +1 000 € ou +10 000 € ;
- compteur de clients : +25 ou +100, sans encaissement ;
- remplissage du comptoir (1 000 cl) et de la réserve (500 cl), livraison incluse ;
- gel/reprise de l’horloge : clients, versement et livraisons continuent ;
- avance d’une heure, uniquement pendant un service ouvert avant la dernière tournée.

L’activation, l’horloge et les modifications sont enregistrées **dans cette partie**.
Désactiver le mode rétablit l’horloge normale, sans annuler l’argent ou les stocks
ajoutés. Une nouvelle partie démarre avec le mode désactivé. Les compteurs de test
ne débloquent pas les fonctionnalités du prototype qui ne sont pas encore portées.

## Repères et commandes

Le départ est celui du jeu d'origine : derrière le comptoir, face à la vitrine.
La tireuse est à gauche, les verres sur le meuble derrière vous, la caisse à gauche
sur le comptoir. En vous retournant vers le meuble du fond, la porte de la réserve
se trouve à droite, comme dans le jeu original.

1. **ZQSD / WASD** : marcher. **Souris** : regarder. **Maj** : courir.
2. **Tab** : ouvrir la tablette. Cliquer sur **Ouvrir le bar**, puis revenir au bar avec
   **Tab** ou **Ranger**. Les onglets changent de page ; la prise de commande et
   l'encaissement restent limités à la proximité du client/de la caisse. Le panneau placé dans la vitrine à côté de la porte fonctionne
   aussi avec **E**. Le service continue pendant l'utilisation de la tablette.
3. Regarder le client au comptoir puis **E** pour prendre sa commande.
4. **E** sur le rangement des verres pour prendre une pinte.
5. Regarder la tireuse, maintenir le **clic gauche** jusqu'à **50 cl**, puis **E** pour
   récupérer la bière. Le versement cesse si la tireuse n'est plus visée/à portée.
6. **E** sur le client pour servir. Il boit, puis rejoint la caisse.
7. **E** sur la caisse : les **5 €** sont crédités après trois secondes.
8. Dans la tablette, transférer la bière de réserve vers le comptoir. Une réserve vide
   permet de commander **500 cl pour 16 €**, livrés après dix secondes. La réserve
   physique ouvre directement cet onglet avec **E** ou **Tab**, où que vous regardiez
   dans cette pièce. Les transferts et achats se font ensuite avec les boutons de la tablette.
9. Le panneau ou la tablette lance la dernière tournée. La fermeture attend le client,
   prélève **35 €** et prépare le soir suivant. Le service va de 17 h à 4 h, une minute
   de jeu toutes les deux secondes réelles.

**E sur la porte vitrée** : ouvrir/fermer les deux battants et sortir dans la rue.
La fermeture est bloquée si vous êtes dans le passage. Six passants marchent sur
les trottoirs ; deux voitures parcourent la chaussée et s’arrêtent devant le joueur.
La promenade reste limitée au pâté de maisons devant le bar.

**P** : menu de pause/reprise. **R** en visant la tireuse : ranger/jeter le verre sans remboursement.
**X** en visant un client non encore servi : refuser la commande. **F5** : sauvegarder.
**F9** : charger. Dans l'éditeur, **Échap** arrête Play.

## Ce qui est repris visuellement

- Les dimensions, positions, orientations, cylindres effilés et ellipsoïdes des fichiers
  `SourceArt/Scene/scene.js` et `venue.js`, avec les catalogues et couleurs de `engine.js`.
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
mémorisent la position dans la salle, la réserve ou la portion de rue accessible.

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
créés par `Scripts/original_assets.py`. `Scripts/original_fonts.py` génère une police
Arial en atlas distance field avec le symbole € et son matériau associé. Elle utilise
la police installée avec Windows. Seul le décor procédural identifié est reconstruit.
Le JSON de scène est lu une fois et partagé entre les modèles ; les passants animent
leurs membres sans reconstruire leurs maillages à chaque image (mise à jour à 30 Hz).

Depuis la racine du dépôt, avec Node et GCC/Clang :

```sh
node unreal/LePetitComptoir/Tests/original_scene_test.cjs
g++ -std=c++17 -Wall -Wextra -Werror -pedantic unreal/LePetitComptoir/Tests/bar_simulation_test.cpp -o /tmp/comptoir-test
/tmp/comptoir-test
g++ -std=c++17 -Wall -Wextra -Werror -pedantic unreal/LePetitComptoir/Tests/tablet_layout_test.cpp -o /tmp/comptoir-tablet-test
/tmp/comptoir-tablet-test
g++ -std=c++17 -Wall -Wextra -Werror -pedantic unreal/LePetitComptoir/Tests/world_layout_test.cpp -o /tmp/comptoir-world-test
/tmp/comptoir-world-test
g++ -std=c++17 -Wall -Wextra -Werror -pedantic unreal/LePetitComptoir/Tests/session_flow_test.cpp -o /tmp/comptoir-session-test
/tmp/comptoir-session-test
```

Le premier test compare **562 344 positions et normales** de 5 662 formes (décor,
clients, verres, portes et animation de rue) à la sortie réelle du renderer JavaScript. Il vérifie la fraîcheur
de l'export, les sols, le passage de la porte, le dégagement du réfrigérateur
et les collisions des objets solides. La projection
à l'écran est comparée dans cinq directions de caméra pour détecter les effets miroir.
Le second teste service, stock, paiement unique, fermeture et sauvegardes. Le troisième
contrôle 175 mises en page de tablette : dimensions, zones cliquables sans chevauchement,
disponibilité des actions, conversion des coordonnées des clics, taille de texte
minimale dans le repère de la tablette et contraste texte/fond d'au moins 4,5:1.
Le quatrième vérifie les zones de réserve, les positions de sauvegarde dans la rue,
la sécurité de fermeture des portes et l’arrêt des voitures dans les deux sens.
Le boîtier et les cinq pages sont inspectables via
les commandes de dessin partagées avec Unreal ; ce contrôle ne remplace pas Play.
Le test natif `LePetitComptoir.Tablet.RenderedText` complète ces contrôles par un
rendu Slate réel. Il est disponible dans l'éditeur ou via `-VerifyTablet` ci-dessus,
et ne peut pas être exécuté avec `-NullRHI`.

Le test natif `LePetitComptoir.World.FontGlyphs` vérifie les glyphes € et accentués
dans la police générée et leur présence sur la page d’atlas utilisée par le matériau.
Il est disponible dans **Outils → Débogage → Session Frontend → Automation**.

À vérifier dans Unreal : ouverture/fermeture de porte depuis les deux côtés, sortie
et retour au bar, voitures, passants, réfrigérateur, symbole € sur la carte, **E/Tab**
dans la réserve, sauvegarde/reprise depuis la rue, puis compilation UHT/C++, compilation des matériaux, absence de
surfaces noires, visibilité du logo et des enseignes, passage vers la réserve, service
complet, netteté des textes, tablette/retour souris, sauvegarde/reprise et comportement sur le deuxième PC.
Ces points nécessitent une exécution du moteur et ne sont pas couverts par les tests hors moteur.

## Réparation et contrôle des textes

La préparation impose maintenant le cache **Offline** et recalcule les métriques de
la police du décor/HUD avant de compiler son matériau. Le décor de révision 4 est
reconstruit en révision 5 pour recalculer aussi les dimensions des textes déjà créés.
La taille des textes HUD ne peut plus tomber à zéro si la petite police d’Unreal ne
fournit pas de hauteur. Si l’atlas généré reste invalide, les panneaux utilisent la
police intégrée à Unreal ; dans ce mode de secours, € est écrit EUR pour rester lisible.
La tablette et les menus continuent à utiliser leur police Slate indépendante.

Pour contrôler les pixels réellement rendus sur le PC Unreal :

```powershell
powershell -ExecutionPolicy Bypass -File .\unreal\LePetitComptoir\Scripts\Setup-Unreal.ps1 -VerifyUI -OpenEditor
```

Cette option contrôle la tablette (5 pages), l’accueil, la création et la pause,
les glyphes de la police, le symbole € rendu par le HUD et un panneau 3D, ainsi que
la sauvegarde en mémoire du nom et du mode développeur. Les captures sont dans
`Saved/Tests/Tablet/` et `Saved/Tests/WorldText/`. Le script s’arrête si un test manque
ou échoue. Aucun test ne remplace une inspection du nom en devanture et de la saisie
avec clavier/souris dans Play. Ces contrôles GPU ne fonctionnent pas avec `-NullRHI`.

Le test portable supplémentaire `Tests/session_flow_test.cpp` vérifie que l’accueil
et le formulaire de création ne lancent ni simulation ni sauvegarde. Les tests du
modèle couvrent aussi les anciennes sauvegardes v1 et les outils développeur v2.
Les trois sauvegardes manuelles et les réglages complets de l’ancienne interface web
ne sont pas encore portés dans ce menu natif.
