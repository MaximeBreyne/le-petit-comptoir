LE PETIT COMPTOIR — BAR · Prototype 0.5.0

WINDOWS 64 BITS
Ouvrir release-final/Le-Petit-Comptoir-Bar-0.5.0-Setup.exe.
L’assistant permet de choisir le dossier et de créer un raccourci.
Le jeu fonctionne hors ligne. Il est désinstallable depuis les paramètres Windows.
L’exécutable de ce prototype n’est pas signé numériquement.

JOUER
Le jeu démarre en plein écran sur l’écran d’accueil. Choisir Nouvelle partie,
Continuer la partie ou Charger une sauvegarde. F11 permet de passer en fenêtre.
Ouvrir le bar, choisir une recette, suivre les étapes, maintenir pour doser,
valider, poser sur le plateau puis servir le client correspondant.
Recettes : bière pression, vin rouge, espresso et mojito.
Les ingrédients sont prélevés au début de la préparation.
Les livraisons prennent 10 secondes de jeu. Les dialogues et Pause arrêtent le temps.
35 euros de charges par soir. Une trésorerie négative termine la partie.
Le bouton Aide détaille les commandes et le fonctionnement.

MENU DE PAUSE
Échap arrête le temps et ouvre le menu : Reprendre la partie, Sauvegarder,
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
La scène 3D comporte du parquet, des matériaux détaillés, un éclairage chaud,
des ombres, des enseignes et des bouteilles et verres arrondis. Les personnages
restent stylisés. Les clients arrivent et repartent en marchant,
conservent leur place au comptoir et bloquent le passage lorsqu'ils attendent.
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
