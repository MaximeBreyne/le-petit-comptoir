# Installateur Windows et mises à jour locales

Installez la version 0.5.0 en ouvrant
`release-final/Le-Petit-Comptoir-Bar-0.5.0-Setup.exe`.
Sur le PC qui a fabriqué l’installateur, le jeu connaît déjà le dossier
`release-final` de ce projet : aucune configuration supplémentaire n’est nécessaire.
Le jeu détecte les versions supérieures construites dans ce dossier et les
installe après sa fermeture normale. Aucun hébergement sur Internet n’est nécessaire.
Si le projet est déplacé ou si le jeu est installé sur un autre PC, choisissez
le dossier contenant les nouvelles versions dans les réglages du jeu.

Les sauvegardes et réglages restent dans le profil de l’application, séparément
de ses fichiers installés. Les anciennes installations antérieures à ce système
doivent recevoir une fois ce nouvel installateur.

## Jouer à la version 0.5.0

Le jeu démarre en plein écran sur son écran d’accueil. Choisissez **Nouvelle
partie**, **Continuer la partie** ou **Charger une sauvegarde**. **F11** permet
de passer du plein écran au mode fenêtré.

Pendant la partie, **Échap** arrête le temps et ouvre le menu de pause :
reprendre, sauvegarder, charger, ouvrir les réglages, retourner au menu
principal ou au bureau. Trois emplacements manuels complètent la sauvegarde
automatique. Le retour au menu ou au bureau conserve la partie actuelle.

Le décor comporte désormais du parquet, des matériaux plus détaillés, des
ombres et un éclairage chaud. Les personnages restent stylisés.

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
utilisable. Les anciens installateurs peuvent être conservés, mais seul le
manifeste `latest.yml` indique la nouvelle version à proposer.
