# Installateur Windows et mises à jour locales

Installez le jeu en ouvrant le fichier `Le-Petit-Comptoir-Bar-<version>-Setup.exe`
présent dans `release-final/` ; `<version>` correspond au numéro du dernier build réussi.
Sur le PC qui a fabriqué l’installateur, le jeu connaît déjà le dossier
`release-final` de ce projet : aucune configuration supplémentaire n’est nécessaire.
Le jeu détecte les versions supérieures construites dans ce dossier et les
installe après sa fermeture normale. Aucun hébergement sur Internet n’est nécessaire.
Si le projet est déplacé ou si le jeu est installé sur un autre PC, choisissez
le dossier contenant les nouvelles versions dans les réglages du jeu.

Les sauvegardes et réglages restent dans le profil de l’application, séparément
de ses fichiers installés. Les anciennes installations antérieures à ce système
doivent recevoir une fois ce nouvel installateur.

## Jouer

Le jeu démarre en plein écran sur son écran d’accueil. Choisissez **Nouvelle
partie**, **Continuer la partie** ou **Charger une sauvegarde**. **F11** permet
de passer du plein écran au mode fenêtré.

La souris commande la caméra dès l’entrée ou la reprise de la partie.
Maintenez **Maj** en vous déplaçant pour courir. La touche de course est
configurable dans les réglages.

**Tab** ouvre ou range la tablette. Ses rubriques regroupent les boissons,
les stocks, le bâtiment, les licences et l’équipe. Choisissez la boisson sur
la tablette : le curseur reste libre pour la préparation et le service.
Cliquez sur le décor pour reprendre la caméra. Les raccourcis boissons
**1 à 4** sont remplacés par ce catalogue ; le service continue pendant
l’utilisation de la tablette.

La réserve est une pièce accessible par la porte à gauche, derrière le bar.
Appuyez sur **E** dans cette pièce pour la gérer. Les achats arrivent en
réserve après **10 secondes de jeu** ; transférez-les ensuite vers le comptoir
depuis la réserve. Une nouvelle partie y dispose d’un lot de chaque ingrédient.

Les améliorations s’achètent depuis la tablette lorsque le nombre de clients
servis et la trésorerie le permettent :

| Achat | Condition | Prix | Effet |
| --- | --- | --- | --- |
| Plateau | 5 clients servis | 100 € | Porter 4 boissons |
| Licence cocktails | 8 clients servis | 120 € | Débloquer le mojito |
| Agrandissement du comptoir | 12 clients servis | 180 € | Augmenter de 50 % le stock possible au comptoir |
| Assistant de réserve | 18 clients servis | 220 € | Transférer automatiquement des ingrédients toutes les 12 secondes pendant le service ; salaire de 10 € par soir |

Les anciennes sauvegardes gardent leurs ingrédients au comptoir et l’accès
aux cocktails. Leur nouvelle réserve commence vide.

**Échap** range d’abord la tablette si elle est ouverte. Lorsqu’elle est rangée,
**Échap** arrête le temps et ouvre le menu de pause :
reprendre, sauvegarder, charger, ouvrir les réglages, retourner au menu
principal ou au bureau. Trois emplacements manuels complètent la sauvegarde
automatique. Le retour au menu ou au bureau conserve la partie actuelle.

Le décor comporte une réserve dédiée, du parquet, des matériaux détaillés,
des ombres et un éclairage chaud. Les chaises font face aux tables et la
machine à café possède un espace distinct pour la tasse en préparation.
Les personnages restent stylisés.

Le logo original vert et doré est présent dans l’accueil, la barre du jeu,
l’application Windows, le raccourci et les assistants d’installation et de
désinstallation. Le PNG source est `dist/assets/brand/logo.png` et l’icône
Windows multirésolution est `dist/assets/brand/icon.ico`. La consigne utilisée
avec la génération d’images intégrée figure dans `design/logo-prompt.txt`.

## Fabriquer l’installateur localement

Avec Node.js 24 et npm disponibles, dans le dossier du projet :

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run dist:win
```

Le résultat se trouve dans `release-final/` : l’installateur `.exe`, sa `.blockmap`
et `latest.yml`. Conservez ces trois fichiers ensemble. Le script vérifie leur
cohérence, l’empreinte SHA-512, la taille de l’installateur et la présence du
programme de mise à jour dans l’application. Il ne publie aucun fichier en ligne.

Le dossier `release-final/build-<date>/` contient aussi la version décompressée.
Pour vérifier à nouveau ce résultat :

```powershell
node scripts/verify-release.cjs release-final/build-<date>
```

Après chaque compilation réussie, vérifiée et publiée dans le dossier local,
le nettoyage automatique conserve ce seul dossier `build-<date>` ainsi que
l’installateur actuel, sa `.blockmap` et `latest.yml` à la racine de `release-final`.
Il supprime les anciens dossiers de build, y compris les compilations incomplètes,
et les installateurs et blockmaps des versions précédentes.

Si la compilation ou sa vérification échoue, le précédent installateur reste
disponible. Si Windows empêche la suppression d’un ancien fichier, notamment
parce qu’il est utilisé, le script affiche un avertissement et réessaie lors du
prochain build réussi. Les sources, sauvegardes, dépendances et caches de
compilation sont conservés.

## Préparer la version suivante

Après avoir modifié le jeu, double-cliquez sur `FABRIQUER-MISE-A-JOUR.cmd`.
Ce raccourci installe les dépendances nécessaires, teste le jeu, augmente son
numéro de version et fabrique le nouvel installateur dans le dossier surveillé.
Il utilise la copie locale de Node.js lorsqu'elle est présente dans `.build`.

Après modification et validation du jeu, augmentez la version puis reconstruisez :

```powershell
npm.cmd version patch --no-git-tag-version
npm.cmd test
npm.cmd run dist:win
```

`npm version patch --no-git-tag-version` augmente la version dans `package.json`
et `package-lock.json`, sans commit ni tag Git. Le nouvel installateur et sa
blockmap sont copiés dans `release-final`, puis le manifeste `latest.yml` est
remplacé en dernier. Le jeu ne peut ainsi voir que les fichiers d’une génération
terminée. Une modification du code seule ne met pas à jour une application
installée : chaque nouvelle version doit être reconstruite avec un numéro supérieur.

Pour utiliser un autre dossier de mises à jour, copiez d’abord l’installateur et
sa blockmap, puis `latest.yml` en dernier. Le dossier doit rester accessible au
jeu ; si le dossier est absent ou indisponible, la version déjà installée reste
utilisable. Le manifeste `latest.yml` indique la nouvelle version à proposer.
Le nettoyage automatique concerne le dossier `release-final` de ce projet.
