# Le Petit Comptoir

Jeu 3D de gestion de bar pour PC, en C++ avec **Unreal Engine 5.8.4**.
Le développement se poursuit sur la branche **`migration/unreal`**.

## Ouvrir le projet

Après avoir récupéré cette branche et installé les outils C++ d’Unreal, fermer
l’éditeur et lancer, depuis la racine du dépôt :

```powershell
powershell -ExecutionPolicy Bypass -File .\unreal\LePetitComptoir\Scripts\Setup-Unreal.ps1 -OpenEditor
```

Ce script compile le code et prépare la carte, les matériaux et les polices.
Ensuite, ouvrir directement `unreal/LePetitComptoir/LePetitComptoir.uproject` pour
les sessions habituelles. Relancer le script après une mise à jour C++ ou du décor.

Voir le [guide Unreal](unreal/LePetitComptoir/README.md) pour l’installation,
les commandes du jeu, les mises à jour, les tests et le travail sur deux PC.

## Contenu du dépôt

- `unreal/LePetitComptoir/Source` : jeu natif, interface et animation de la rue.
- `unreal/LePetitComptoir/Content` : données de scène et assets Unreal, suivis avec LFS.
- `unreal/LePetitComptoir/Config` : configuration du projet.
- `unreal/LePetitComptoir/Scripts` : préparation Unreal et export du décor.
- `unreal/LePetitComptoir/SourceArt` : sources procédurales encore nécessaires au décor.
- `unreal/LePetitComptoir/Tests` : contrôles hors moteur.

L’ancienne application web/Electron, ses lanceurs Windows, ses mises à jour et ses
outils de livraison ont été retirés de cette branche. Leur historique reste dans Git.
Les sources de décor conservées ne constituent pas une application web exécutable.
La migration des fonctionnalités reste partielle ; son périmètre est décrit dans le guide.
