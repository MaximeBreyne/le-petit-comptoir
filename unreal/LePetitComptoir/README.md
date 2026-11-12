# Le Petit Comptoir — portage Unreal

Projet natif C++ pour **Unreal Engine 5.8.4 sur Windows**. Les seules sources JavaScript conservées sont les générateurs du décor et leur
référence de géométrie, dans `SourceArt/Scene/`. Le jeu fonctionne nativement sous Unreal.

Le décor du premier pilote était une approximation trop simplifiée. Cette version
reprend le décor original d’une nouvelle partie et ses détails supplémentaires : salle,
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

**La migration fonctionnelle reste partielle** : bière, vin rouge, espresso, eau pétillante, cola et tonic, trois
clients simultanés au comptoir, plateau de quatre boissons, choix du contenant,
paiement par carte, stocks, fermeture et sauvegarde. Les cocktails, employés,
extensions et réglages complets du prototype ne sont pas encore portés. La géométrie est vérifiée par comparaison avec le moteur original ;
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
cinq pages, les trois menus et le choix du verre ; il échoue si les caractères ou les titres ne sont pas visibles.
Il enregistre les captures `Saved/Tests/Tablet/Tablet-0.bmp` à `Tablet-8.bmp` et un
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
un menu de pause avec Reprendre, Sauvegarder, Charger, Réglages, Retour à l’accueil et Retour au bureau.
Le retour à l’accueil et la sortie sauvegardent d’abord la partie ; en cas d’échec,
le menu reste ouvert. Dans PIE, Échap reste la commande Unreal d’arrêt du jeu.

**Tab → Développeur → Activer** donne accès à :

- argent de test : +100 €, +1 000 € ou +10 000 € ;
- compteur de clients : +25 ou +100, sans encaissement ;
- remplissage des six stocks au comptoir, au réfrigérateur et en réserve, livraisons incluses ;
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
3. Regarder chaque client au comptoir puis **E** pour prendre sa commande. Jusqu’à
   **trois clients** peuvent commander, boire ou attendre le paiement simultanément.
   Chaque client porte un numéro dans le HUD et la tablette.
4. **E sur VERRERIE** ouvre un pop-up : **Pinte**, **Verre à vin** ou **Tasse**.
   Les quantités à servir et déjà préparées sont indiquées, sans imposer le choix.
   Il est possible de préparer une boisson à l’avance, même bar fermé. **Tab** ferme
   le pop-up sans rien choisir. Un contenant encore vide peut être remplacé gratuitement.
5. Rejoindre le poste correspondant et maintenir le **clic gauche**, puis **E** pour
   poser la boisson terminée sur le plateau. Le versement cesse si le poste n’est plus visé.
   Un mauvais contenant ne consomme aucun stock. Une préparation commencée doit être
   terminée ou jetée avec **R** avant de changer de contenant.

   | Boisson | Contenant | Poste | Quantité | Prix client |
   | --- | --- | --- | --- | --- |
   | Bière blonde | Pinte | Tireuse | 50 cl | 5 € |
   | Vin rouge | Verre à vin | Bouteille VIN du meuble arrière | 15 cl | 6 € |
   | Espresso | Tasse | Machine à café | 25 ml, soit 1 dose | 3 € |
   | Eau pétillante | Verre à soft | Réfrigérateur | 25 cl, soit 1 bouteille | 3 € |
   | Cola | Verre à soft | Réfrigérateur | 25 cl, soit 1 bouteille | 3,50 € |
   | Tonic | Verre à soft | Réfrigérateur | 25 cl, soit 1 bouteille | 3,50 € |

   **E sur le réfrigérateur derrière le bar** ouvre le choix des trois boissons fraîches.
   Choisir la boisson, viser à nouveau le réfrigérateur, maintenir le clic gauche pour
   remplir le verre puis **E** pour le poser sur le plateau. Chaque rangée contient
   au maximum 12 bouteilles étiquetées ; elles diminuent avec le stock et reviennent
   au réapprovisionnement. Les modèles ne sont reconstruits que si ce nombre change.
   La bière pression reste à la tireuse, le vin sur l’étagère et l’espresso à la machine.

6. Le **plateau contient quatre boissons**. **E sur un client** sert uniquement la
   boisson qu’il a commandée ; les autres restent disponibles. Le service peut se faire
   dans n’importe quel ordre. L’onglet **À préparer** liste les trois commandes et le
   contenu du plateau, avec un bouton **Jeter** par boisson pour libérer une place.
7. Chaque client rejoint la caisse après consommation. **E sur la caisse** lance le
   règlement du prochain client prêt à payer : montant propre à sa boisson, crédité
   après trois secondes. Le terminal traite **un paiement à la fois**.
8. L’onglet **Réserve** gère les six stocks séparément. La réserve
   physique ouvre cet onglet avec **E** ou **Tab**. Lots livrés après dix secondes :
   **500 cl de bière pour 16 €**, **75 cl de vin pour 7 €**, **20 doses de café pour 5 €**,
   **12 eaux pour 6 €**, **12 colas pour 9 €** ou **12 tonics pour 9 €**.
   Le stock est déduit une seule fois au début du versement ; jeter ne rembourse pas.
9. Le panneau ou la tablette lance la dernière tournée. La fermeture attend **tous**
   les clients, prélève **35 € une seule fois** et prépare le soir suivant.
   Le service va de 17 h à 4 h, une minute de jeu toutes les deux secondes réelles.

**E sur la porte vitrée** : ouvrir/fermer les deux battants et sortir dans la rue.
La fermeture est bloquée si vous êtes dans le passage. Six passants marchent sur
les trottoirs ; deux voitures parcourent la chaussée et s’arrêtent devant le joueur.
La promenade reste limitée au pâté de maisons devant le bar.

**P** : menu de pause/reprise. **R** en visant un poste de préparation ou la verrerie : ranger le contenant vide ou jeter la préparation sans remboursement.
**X** en visant un client non encore servi : refuser la commande. **F5** : sauvegarder.
**F9** : charger. Dans l'éditeur, **Échap** arrête Play.

## Ce qui est repris visuellement

- Les dimensions, positions, orientations, cylindres effilés et ellipsoïdes des fichiers
  `SourceArt/Scene/scene.js` et `venue.js`, avec les catalogues et couleurs de `engine.js`.
- La réserve, la rue, les enseignes, les tables rondes, les chaises, les six tabourets,
  la tireuse, la machine à café, les bouteilles, le terminal et la verrerie.
- Trois variantes de clients assis/debout, les pintes, verres à vin et tasses, vides ou remplis.
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

Le format de simulation **v4** conserve chaque commande, le plateau, le contenant,
le dosage et les six stocks/livraisons. Les formats v1, v2 et v3 restent lisibles :
les commandes et préparations existantes sont conservées sans double débit/crédit.
Les anciennes parties reçoivent les stocks initiaux des boissons fraîches :
12 bouteilles de chaque boisson au réfrigérateur et 12 en réserve.
Une sauvegarde v4 ne peut pas être ouverte avec l’ancien code : synchroniser les deux PC.

Les trois emplacements manuels `LePetitComptoir_Manual_1` à `_3` sont séparés de
l’autosauvegarde. **P → Sauvegarder** affiche ces emplacements ; remplacer un fichier
existant demande confirmation. **Charger** affiche l’autosauvegarde et les trois
emplacements, avec le nom du bar, le soir, la trésorerie et la date lorsqu’elle existe.
Charger pendant une partie demande confirmation. Une nouvelle partie ne touche pas
aux sauvegardes manuelles. Les sauvegardes web/Electron de `dev` ne sont pas importées.

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

Le premier test compare **1 203 432 positions et normales** de 11 955 formes (décor,
clients, verres, portes et animation de rue) à la sortie réelle du renderer JavaScript. Il vérifie la fraîcheur
de l'export, les sols, le passage de la porte, le dégagement du réfrigérateur
et les collisions des objets solides. La projection
à l'écran est comparée dans cinq directions de caméra pour détecter les effets miroir.
Le second teste commandes simultanées, contenants, plateau, stocks, file de paiement, fermeture, migration v1/v2/v3 et 20 000 séquences d’actions/sauvegardes. Le troisième
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

Cette option contrôle la tablette (5 pages), l’accueil, la création, la pause, les sauvegardes,
les réglages, la confirmation, le choix du verre et le réfrigérateur,
les glyphes de la police, le symbole € rendu par le HUD et un panneau 3D, ainsi que
la sauvegarde en mémoire du nom, du mode développeur et des commandes multiples.
Elle vérifie aussi les pixels dorés d’une bière à moitié remplie et pleine dans une scène de rendu. Les captures sont dans
`Saved/Tests/Tablet/`, `Saved/Tests/WorldText/`, `Saved/Tests/Drinks/` et `Saved/Tests/Graphics/`. Le script s’arrête si un test manque
ou échoue. Aucun test ne remplace une inspection du nom en devanture et de la saisie
avec clavier/souris dans Play. Ces contrôles GPU ne fonctionnent pas avec `-NullRHI`.

Le test portable supplémentaire `Tests/session_flow_test.cpp` vérifie que l’accueil
et le formulaire de création ne lancent ni simulation ni sauvegarde. Les tests du
modèle couvrent aussi les anciennes sauvegardes v1 et les outils développeur v2.
L’accueil et la pause reprennent le thème, les textes et les actions de `dev`
(commit `726b07c2ee378e488dda6bf67e6f4f6ae6afdbe0`, `dist/menus.js` et `dist/menus.css`).
La présentation est adaptée à Slate : fond charbon, titres dorés, bar visible à droite,
action principale et confirmations. Les trois sauvegardes manuelles sont natives.
**Réglages** fonctionne à l’accueil et en pause : qualité, limite 30/60/120 images/s,
affichage fenêtré ou plein écran fenêtré, sensibilité, champ de vision vertical,
luminosité et inversion verticale. Les réglages de caméra se voient en reprenant le jeu.
Ces préférences sont persistées séparément des parties, sur chaque PC. Le mode
fenêtré/plein écran se vérifie dans une fenêtre autonome ou le jeu empaqueté.
L’audio, les raccourcis personnalisables et la manette de l’ancienne interface restent
à porter ; aucun réglage sans effet n’est proposé.


## Rendu des boissons

La préparation ne dessine plus un cylindre de bière avec le matériau sombre du mobilier.
Les boissons reprennent les modèles d’origine, avec huit niveaux de remplissage et un
matériau de liquide dédié (`M_Original_16`) : couleur blonde et mousse claire pour la
bière, parois transparentes séparées. Le modèle ne se reconstruit que lorsque le type
ou le niveau visible change, jamais systématiquement à chaque image. Le plateau et
les verres servis utilisent le même modèle plein.

Après la mise à jour, lancer le script pour générer ce nouveau matériau. Le test
`LePetitComptoir.Drinks.GoldenBeer`, inclus dans `-VerifyUI`, capture les modèles à
mi-remplissage et pleins et échoue si les pixels dorés attendus sont absents.
Ces tests GPU et la compilation C++ Unreal doivent être exécutés sur le PC équipé
d’Unreal ; les contrôles hors moteur ne prouvent pas le rendu final dans le bar.


## Amélioration visuelle — décor révision 6

Cette version conserve les dimensions, les positions et les interactions du bar.
Elle ajoute :

- matériaux procéduraux avec couleur, rugosité et microrelief : parquet à joints,
  bois veiné, briques et mortier, enduit, pierre, métal brossé, tissu et cuir ;
- verre transparent avec reflets variables selon l'angle et éclairage de surface ;
- chanfreins de quelques millimètres sur le mobilier, cylindres à 32 côtés,
  silhouettes plus lisses et parois de verres/tasses à 32 segments ;
- moulures, fixations de laiton, grilles et charnières du réfrigérateur,
  boutons de machine à café, sous-verres, linge, menus et finition de l'enseigne ;
- ciel atmosphérique, lumière naturelle par la vitrine, suspensions dirigées
  vers le sol, éclairage des étagères et de la réserve, reflets écran et occlusion
  ambiante ; ombres des clients, des voitures et des passants proches.

Les surfaces ordinaires n'émettent plus de lumière artificielle. Les luminaires et
le liquide gardent leur émission dédiée ; la mousse de bière est plus mate.
Les coordonnées de texture sont attachées aux objets pour suivre leurs mouvements.
Les détails fins s'atténuent avec la distance pour limiter le scintillement.
Les formes extérieures au-delà de 40 m du centre du bar gardent leur géométrie légère.
Les 11 955 formes de toutes les variantes réunies représentent 2 069 592 sommets ;
ce total n'est pas le nombre de sommets visibles simultanément. Le contrôle d’une
borne haute de la scène active reste sous 2 millions (1 787 436 sommets, avec toutes
les boissons comptées à chaque place et les deux poses des clients par prudence). Le décor reste
regroupé par matériau et n'est pas retessellé à chaque image. Les détails ne créent
aucune collision et ne recouvrent ni les verres en préparation ni le plateau.

### Appliquer sur un projet existant

Fermer Unreal, récupérer la branche puis lancer la préparation :

```powershell
git pull --ff-only origin migration/unreal
git lfs pull
powershell -ExecutionPolicy Bypass -File .\unreal\LePetitComptoir\Scripts\Setup-Unreal.ps1 -VerifyUI -OpenEditor
```

Les 17 matériaux générés sont actualisés à leurs chemins existants lorsqu'une
empreinte du générateur ou du shader change. Une seconde exécution sans changement
ne les reconstruit pas. Les autres matériaux ne sont pas modifiés. Avant de remplacer
le décor généré de la carte existante, la préparation copie la carte dans
`Saved/Backups/BeforeVisualUpgrade/`. Elle conserve les acteurs ajoutés manuellement.
Les sauvegardes de partie et le nom du bar sont inchangés.

Le contrôle `LePetitComptoir.Graphics.MaterialsAndViews`, inclus dans `-VerifyUI`,
vérifie les erreurs de compilation des matériaux et génère cinq vues en 1280 × 720
sous `Saved/Tests/Graphics/`. Il détecte un rendu entièrement sombre, uniforme ou
largement surexposé. Pour ne lancer que ce contrôle, utiliser `-VerifyGraphics`.
Les captures doivent aussi être regardées : ces seuils ne jugent pas l'esthétique,
les petits défauts, la fluidité ni la lisibilité en mouvement.

### Exposition et ambiance du bar

La révision 9 du décor réduit les lumières d'appoint de la vitrine, du comptoir et
des étagères, ainsi que la lumière ambiante et le halo des lampes. Le comptoir
projette désormais des ombres sous son éclairage de travail. L'exposition manuelle
est réglée à −2 EV de compensation : le volume du décor et la caméra du joueur
partagent cette valeur. Le réglage **Luminosité : 100 %** utilise cette base ; les
préférences existantes ajustent cette base sans la remettre à zéro à chaque image.
Les interfaces Slate conservent leur luminosité.

`Setup-Unreal.ps1` remplace les composants générés de l'ancienne révision après
sauvegarde de la carte dans `Saved/Backups/BeforeVisualUpgrade/`. Le lancement du
jeu actualise aussi un ancien décor encore présent en mémoire. Aucun effacement
de sauvegarde de partie n'est nécessaire.

Le contrôle graphique utilise les réglages de la caméra réelle après son `Tick`
et ajoute `BehindBar.bmp`, face à la vitrine comme au démarrage. Il mesure les
zones presque blanches (luminance supérieure à 245/255, moins de 10 % de l'image)
et les pixels saturés sur les trois canaux (moins de 2 %), tout en contrôlant que
la scène reste visible. Les anciens rendus trop clairs de la salle, du service et
de la réserve dépassent ces limites. La compilation Unreal et les cinq nouvelles
captures doivent être vérifiées sur un PC équipé du moteur ; les réglages seuls
ne constituent pas une validation visuelle.

### Validation et limites

`Tests/original_scene_test.cjs` exécute également `visual_geometry_test.cpp` :
maillages fermés, normales, orientation des triangles, dimensions conservées,
coordonnées de texture stables et budget de géométrie. Il contrôle le dégagement
du service, du réfrigérateur, des portes et de la réserve.
Le test HLSL optionnel `python3 unreal/LePetitComptoir/Tests/surface_shader_test.py`
utilise `libshaderc` sous Linux pour contrôler les types et la syntaxe des 17 variantes.
Il ne remplace pas la compilation des matériaux par Unreal/DX12.

Le rendu utilise des sources dynamiques et des reflets en espace écran, sans imposer
une carte RTX. Lumen et les champs de distance ne sont pas activés sur ces maillages
procéduraux. Les reflets ne peuvent donc pas reproduire tous les objets hors écran ;
le ciel fournit une réflexion d'environnement. Les personnages restent les modèles
procéduraux existants, lissés, et ne sont pas des humains scannés ou des MetaHumans.
Cette amélioration ne remplace pas une future passe de modèles artistiques dédiés.
La compilation C++ Unreal, les contrôles GPU, l'inspection des quatre captures et
la mesure des performances doivent être faits sur les PC équipés du moteur.


## Réfrigérateur et menu — décor révision 7

Après cette mise à jour, relancer `Setup-Unreal.ps1` : le décor généré passe en
révision 7 pour retirer les bouteilles décoratives fixes du réfrigérateur et ajouter
les étiquettes de ses trois rangées. Les bouteilles sont désormais des acteurs natifs
qui suivent le stock de la partie. La carte murale affiche les six boissons servies.
La préparation sauvegarde la carte précédente dans `Saved/Backups/BeforeVisualUpgrade/`.

## Réparation des panneaux — décor révision 8

Le générateur de police fournit désormais une liste complète de lettres, chiffres,
accents et ponctuation, avec le symbole €. La précédente liste limitée aux caractères
spéciaux pouvait produire des glyphes vides. `Setup-Unreal.ps1` réimporte la police à
son chemin existant si elle est incomplète ou si son générateur change. Avant cette
opération, ses fichiers sont copiés dans `Saved/Backups/BeforeFontRepair/`.
Une police valide et à jour est réutilisée. La préparation s’arrête si la nouvelle
police reste invalide. La révision 8 du décor actualise aussi les panneaux qui avaient
enregistré la police de secours, avec la sauvegarde de carte décrite ci-dessus.

Les tests GPU de bière et de texte 3D attendent la compilation des matériaux et
préparent plusieurs images avec l’exposition manuelle utilisée dans le bar. Le test
de bière conserve son seuil de pixels dorés et ajoute un verre vide de contrôle ;
les captures `Beer-0.bmp`, `Beer-4.bmp` et `Beer-8.bmp` sont dans `Saved/Tests/Drinks/`.
Cette préparation des tests ne change pas les matériaux de boisson du jeu.

En cas d’échec de `-VerifyUI`, les messages détaillés sont affichés dans le terminal
et écrits dans `failures.txt`, à côté de `index.json` dans le dossier du rapport indiqué.
Le script crée aussi `diagnostics.zip` dans ce dossier : il contient ces deux fichiers,
le journal Unreal complet du test et les captures produites pendant cette exécution,
sans reprendre les anciennes images. Le journal brut est conservé à côté du dossier
du rapport, avec le même identifiant et le suffixe `-Unreal.log`.
Si la compression échoue, le journal indique où trouver les fichiers séparés.
Le test portable `python3 unreal/LePetitComptoir/Tests/font_generation_test.py`, lancé
depuis la racine du dépôt, contrôle la couverture des textes de la scène, la réparation
d’une ancienne police, sa sauvegarde et la gestion d’un échec de réimportation avec
une API simulée. Il ne remplace pas la compilation C++ ni l’import et le rendu sous Unreal.

Les tests de scènes utilisent des commandes différées : chaque vue est préparée
pendant **24 trames distinctes du moteur**, puis lue à la trame suivante. Une boucle
qui appelle seulement `World::Tick` et `FlushRenderingCommands` dans `RunTest` ne
fait pas avancer le compteur de trames du moteur. Les anciens tests pouvaient ainsi
capturer les trois modèles de bière et détruire leur scène dans une seule trame.
La scène, les composants, les matériaux et la cible de rendu restent maintenant en
mémoire jusqu’à la dernière lecture. Le journal donne les numéros des trames utilisées.

Les matériaux sont partagés entre les scènes de test. Après avoir terminé les tâches
de chargement, la préparation conserve les shaders déjà utilisables sur le thread de
rendu, y compris ceux préparés par un test précédent. Si le proxy utilise encore un
matériau de secours, elle prépare les ressources pour le niveau graphique de la scène
dans un `FMaterialUpdateContext`, afin de synchroniser les proxies et de recréer les
états de rendu dépendants. Les identifiants des assets et leur cache disque sont conservés.
Après les trames de préparation, le contrôle interroge le proxy sur le thread de rendu
avec le niveau graphique de la scène. Il échoue si Unreal utilise un matériau de
secours et conserve les erreurs de compilation. Il ne déduit plus ce résultat du seul
indicateur `HasValidGameThreadShaderMap`. Les seuils de pixels restent inchangés.
Ces attentes sont limitées aux tests de l’éditeur, sans ajouter de blocage au jeu.

Les captures `Beer-4-LiquidOnly.bmp` et `Beer-8-LiquidOnly.bmp` montrent aussi le liquide
sans la paroi du verre et doivent conserver sa couleur dorée. Le verre complet reste
obligatoirement vérifié. Le texte 3D est porté par un acteur comme les panneaux du bar.
`World-Empty.bmp` vérifie que la capture efface l’ancienne image du HUD ;
`World-Euro.bmp` doit afficher le symbole €, et `World-DefaultFont.bmp` la lettre A
avec la police standard du moteur. Ces deux matériaux de texte sont éclairés : le test
place donc une lumière blanche face au texte (normale +X, lumière dirigée vers −X),
avec une exposition fixe. Le journal vérifie cette orientation. La lumière générique
de la scène de prévisualisation pouvait éclairer le dos du texte, le rendant noir
sur le fond noir même avec une police et un matériau valides.
`World-Euro-Reverse.bmp` conserve le contrôle d’orientation. Les captures sont produites
même lorsqu’un matériau échoue. Cet éclairage de contrôle ne change pas celui du bar.

Le séquencement est vérifiable sans Unreal :

```bash
g++ -std=c++17 -Wall -Wextra -Werror -pedantic unreal/LePetitComptoir/Tests/render_sequence_test.cpp -o /tmp/comptoir-render-sequence
/tmp/comptoir-render-sequence
```

Ce test vérifie qu’appeler plusieurs fois la commande dans une même trame ne réduit
pas les 24 trames de préparation, que chaque lecture suit les captures du bon modèle
et qu’un abandon arrête les actions suivantes. Il ne valide pas le rendu GPU : relancer
`-VerifyUI` sous Unreal 5.8.4 pour cette vérification.

## Prétest Windows hors de l’éditeur

1. Préparer le projet avec le script, puis enregistrer la carte **ComptoirOriginal**.
2. Dans **Plateformes**, choisir **Développement**, puis **Empaqueter le projet → Windows**
   (architecture x64 pour un PC Intel/AMD, si le choix apparaît).
3. Choisir un dossier de sortie hors du dépôt, par exemple `C:\Jeux\LePetitComptoir-Pretest`.
4. Une fois l’empaquetage terminé, lancer `LePetitComptoir.exe` dans le dossier produit.
   Pour un autre testeur, transmettre le dossier complet compressé en ZIP, pas seulement
   l’exécutable. Unreal Editor n’est pas nécessaire pour jouer au jeu empaqueté.

Contrôler dans cette version : nouvelle partie et nom du bar, continuer, trois sauvegardes
manuelles et confirmations, réglages après redémarrage, stock du frigo vide puis rempli,
commandes simultanées des six boissons, paiement, rue et réserve. Cette compilation et
ces vérifications doivent être réalisées sur le poste équipé d’Unreal.
