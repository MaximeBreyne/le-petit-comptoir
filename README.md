LE PETIT COMPTOIR — BAR · Prototype

WINDOWS 64 BITS
Ouvrir l’installateur Le-Petit-Comptoir-Bar-VERSION-Setup.exe dans release-final.
VERSION correspond au numéro du dernier build réussi.
L’assistant permet de choisir le dossier et de créer un raccourci.
Le jeu fonctionne hors ligne. Il est désinstallable depuis les paramètres Windows.
L’exécutable de ce prototype n’est pas signé numériquement.

LOGO
Le nouveau logo vert et doré apparaît dans l’accueil et la barre du jeu,
ainsi que sur l’application Windows, son raccourci et les assistants
d’installation et de désinstallation.
Source PNG : dist/assets/brand/logo.png.
Icône Windows en plusieurs tailles : dist/assets/brand/icon.ico.
Le visuel original a été créé avec la génération d’images intégrée ;
sa consigne de création est conservée dans design/logo-prompt.txt.

JOUER
Le jeu démarre en plein écran sur l’écran d’accueil. Choisir Nouvelle partie,
Continuer la partie ou Charger une sauvegarde. F11 permet de passer en fenêtre.
La souris commande la caméra dès l’entrée ou la reprise de la partie.
Maintenir Maj en se déplaçant permet de courir. Cette touche est configurable
dans Réglages, comme les autres commandes de déplacement.
Tab ouvre ou range la tablette de gestion. Choisir une boisson sur la tablette
libère le curseur pour la préparer ; cliquer sur le décor reprend la caméra.
La tablette regroupe les boissons, les stocks, le bâtiment, les licences
et l’équipe. Le service continue pendant son utilisation.
Ouvrir le bar, choisir une recette sur la tablette, suivre les étapes, maintenir pour doser,
valider, poser sur le plateau puis servir le client correspondant.
Les touches 1 à 4 ne sélectionnent plus les boissons.
Les ingrédients sont prélevés au début de la préparation.
35 euros de charges par soir, auxquels s’ajoute le salaire d’un employé recruté.
Une trésorerie négative termine la partie.
Le bouton Aide détaille les commandes et le fonctionnement.

RÉSERVE ET STOCKS
La porte de la réserve se trouve à gauche, derrière le bar. Entrez dans la
pièce et appuyez sur E pour gérer les stocks. Les achats arrivent dans la
réserve après 10 secondes de jeu ; transférez ensuite les ingrédients vers
le comptoir depuis cette pièce. La tablette distingue ces deux stocks.
Une nouvelle partie commence avec un lot de chaque ingrédient en réserve.
Les anciennes sauvegardes conservent leur stock au comptoir et commencent
avec une réserve vide : aucun ingrédient existant n’est perdu.

PROGRESSION SUR LA TABLETTE
Plateau de 4 boissons : 5 clients servis et 100 euros.
Licence cocktails : 8 clients servis et 120 euros, pour débloquer le mojito.
Agrandissement du comptoir : 12 clients servis et 180 euros, pour augmenter
de 50 % sa capacité de stockage des ingrédients.
Assistant de réserve : 18 clients servis et 220 euros. Il réapprovisionne
automatiquement le comptoir depuis la réserve toutes les 12 secondes
pendant le service et coûte 10 euros de salaire par soir.
Les anciennes sauvegardes gardent l’accès aux cocktails.

MENU DE PAUSE
Échap range d’abord la tablette si elle est ouverte. Une fois la tablette
rangée, Échap arrête le temps et ouvre le menu : Reprendre la partie, Sauvegarder,
Charger une sauvegarde, Réglages, Retour au menu principal ou Retour au bureau.
Échap depuis ce menu reprend la partie. Le retour au menu principal ou au
bureau enregistre la progression actuelle.

SAUVEGARDE
Automatique toutes les 5 secondes et après les actions importantes.
Trois emplacements manuels sont disponibles depuis le menu de pause.
Le chargement propose ces emplacements et la sauvegarde automatique.
Stockée dans le profil de l’application Windows, séparément de la version navigateur.
La sauvegarde du bureau de tabac est conservée et n’est pas convertie.
Nouvelle partie remplace la sauvegarde automatique après confirmation,
mais conserve les sauvegardes manuelles.

DÉVELOPPEMENT
npm install
npm test
npm start
npm run dist:win
Les sources du jeu sont dans dist/, le lanceur Windows dans desktop/.
La scène 3D comporte une réserve accessible, du parquet, des matériaux détaillés, un éclairage chaud,
des ombres, des enseignes et des bouteilles et verres arrondis. Les personnages
restent stylisés. Les clients arrivent et repartent en marchant,
conservent leur place au comptoir et bloquent le passage lorsqu'ils attendent.
Les chaises font face aux tables et la machine à café laisse un espace
distinct pour la tasse en préparation, sans tasse superposée.
La souris et les flèches suivent le sens du regard : gauche vers gauche.

VÉRIFICATIONS DU RENDU
node checks/realism.cjs
Ce contrôle nécessite Node 22+ et Chrome sous Windows (CHROME_PATH permet
de choisir son exécutable). Il utilise un profil de test temporaire et vérifie
la souris, les déplacements, les clients, la stabilité de l'interface et WebGL.
L'aperçu est enregistré dans checks/artifacts/realism-preview.png.

INSTALLATEUR ET MISES À JOUR
Voir README-release.md. L’installateur est généré dans release-final.
Les mises à jour utilisent uniquement un dossier local, sans publication en ligne.
Sur ce PC, release-final est surveillé automatiquement ; si le dossier est
déplacé, choisissez-le dans Réglages > Mises à jour du jeu.
FABRIQUER-MISE-A-JOUR.cmd prépare la version suivante et actualise ce dossier.
La nouvelle version disponible s’installe à la fermeture normale du jeu.
Après un build réussi et vérifié, les anciennes versions et leurs fichiers de
compilation sont supprimés automatiquement. Seuls le build actuel et ses fichiers
de mise à jour restent dans release-final. En cas d’échec de compilation ou de
vérification, le précédent installateur reste disponible.
Un fichier ancien impossible à supprimer est signalé et le nettoyage est retenté
au prochain build réussi. Les sauvegardes, sources, dépendances et caches sont conservés.
