LE PETIT COMPTOIR — BAR · Prototype

UNREAL ENGINE
Sur la branche migration/unreal, le portage C++ et le décor original se trouvent dans
[unreal/LePetitComptoir](unreal/LePetitComptoir/README.md).
Ce dossier contient les instructions de compilation pour Unreal 5.8.4 et de
synchronisation entre deux PC. La compilation et le rendu Unreal restent à valider.
Les instructions ci-dessous concernent le prototype Electron existant.

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
Tab ouvre ou range la tablette de gestion. La rubrique À préparer liste les
boissons commandées ; la sélection des recettes se fait au rangement des verres.
La tablette regroupe le service, les commandes à préparer, la caisse, les stocks, le bâtiment,
les licences et l’équipe. Le service continue pendant son utilisation.
Pour ouvrir le bar, approchez le panneau suspendu à la porte d’entrée et appuyez
sur E, ou utilisez Ouvrir le bar dans Service sur la tablette.
Un clic en regardant le panneau à proximité permet également de le tourner.
Le même panneau ou bouton lance la dernière tournée : les clients présents
doivent être servis et encaissés avant le bilan. Le panneau reflète cet état.
Le service s’étend de 17 h à 4 h du matin. Une minute dans le jeu prend
deux secondes réelles : la soirée dure environ 22 minutes, hors pauses
et temps nécessaire pour terminer les dernières commandes et paiements.
En haut à gauche, le statut, le temps restant et une barre d’avancement
suivent ces horaires. Après minuit, l’horloge affiche 00:00, 01:00, etc.
Les déplacements, préparations, livraisons et clients gardent leur rythme.
Les stocks, améliorations et l’action Nouveau bar se consultent uniquement
dans la tablette ; Nouveau bar se trouve dans Bâtiment et demande confirmation.
Les indications de préparation apparaissent uniquement derrière le comptoir.
Regardez le rangement des verres derrière le bar et appuyez sur E : choisissez
la boisson et prenez son récipient, puis posez-le au poste indiqué. Prenez les ingrédients dans les bouteilles et
bacs étiquetés avec E ou un clic, et apportez-les un par un au poste.
Restez près du poste pour maintenir la touche de dosage. Regardez le verre et
appuyez sur E pour valider, mélanger si nécessaire, puis prendre la boisson
sur le plateau. S’éloigner arrête le versement. Une préparation ne peut pas
être commencée ou poursuivie depuis une table. Pour l’abandonner, regardez
son verre, faites un clic droit et choisissez Jeter cette préparation.
Pour jeter une boisson terminée, regardez-la sur le plateau, appuyez sur E
et choisissez Jeter cette boisson.
Cinq emplacements gardent des boissons en cours : deux bières, un café et
deux autres boissons (vin ou cocktails). Posez votre récipient ou ingrédient
avant de commencer une autre boisson. Regardez un verre laissé au poste et
appuyez sur E pour le reprendre ; son dosage et ses ingrédients sont conservés.
Le plateau plein empêche seulement de récupérer la boisson, qui reste au poste.
La file des commandes apparaît sur la tablette et en jeu : à faire, en préparation,
à récupérer, sur le plateau ou en service. Deux commandes identiques restent
distinctes, et le préparateur ne relance pas une commande déjà en cours.
Les touches 1 à 4 ne sélectionnent plus les boissons.
Les ingrédients sont prélevés à la prise ; la bière au premier tirage.
Un ingrédient tenu et toutes les préparations en cours sont conservés dans la sauvegarde.
Les anciennes préparations déjà payées restent utilisables sans nouveau débit.
35 euros de charges par soir, auxquels s’ajoutent les salaires des employés recrutés.
Une trésorerie négative termine la partie.
Le bouton Aide détaille les commandes et le fonctionnement.

MODE DÉVELOPPEUR
Pendant une partie, ouvrez Réglages puis activez Mode développeur.
Ce mode est désactivé par défaut et appartient à la sauvegarde en cours.
Il permet d’ajouter un montant de trésorerie, d’augmenter le total de clients
encaissés pour tester les déblocages, ou de remplir les stocks autorisés.
L’argent ajouté ne compte pas comme recette ; les améliorations, licences
et recrutements restent à acheter avec leurs prérequis habituels.
Le remplissage complète le comptoir jusqu’à sa capacité et la réserve
jusqu’à cinq lots par ingrédient déjà débloqué, sans acheter de licence.
Geler l’horloge arrête seulement l’heure : les clients, employés, préparations
et livraisons continuent. Avancer d’une heure fonctionne pendant le service
et lance la dernière tournée à 4 h, sans supprimer les clients présents.
Désactiver le mode relance l’horloge. Les actions et l’activation sont sauvegardées ;
une nouvelle partie commence avec le mode développeur désactivé.

SERVICE À TABLE ET ENCAISSEMENTS
Six tabourets sont installés au comptoir, en plus des quatre tables numérotées.
Au début, trois places au comptoir accueillent des clients : l’affluence initiale
reste inchangée, avec au maximum sept clients présents. Les autres places
s’ouvrent automatiquement après 20, 45 et 80 clients encaissés au total,
pour atteindre respectivement huit, neuf et dix clients présents au maximum.
Les arrivées restent espacées : 16 secondes au début, puis 15, 14 et 12 secondes
selon le palier. Le plateau amélioré conserve son rythme de 12 secondes.
Le premier client arrive seul, une seconde après l’ouverture du service.
Tab > Service indique la fréquentation et la progression vers la prochaine place.
Les clients s’assoient sur les tabourets, face au bar ; les places supplémentaires
n’ajoutent aucun client au lancement d’une nouvelle partie.
Rejoignez un client, regardez-le et appuyez sur E ou cliquez pour prendre sa
commande sur la tablette qui s’ouvre. Validez Prendre la commande à proximité.
Revenez avec la boisson sur le plateau et interagissez de la même
façon pour servir automatiquement la bonne boisson. La tablette conserve
la liste des commandes, mais n’est pas nécessaire pour servir ou encaisser.
Après la dégustation, les clients quittent leur siège et rejoignent la caisse,
y compris depuis l’étage et la boîte de nuit. Deux places forment la file devant
le guichet ; les autres clients attendent leur tour assis. Les règlements se font
un par un, seulement lorsque le premier client est arrivé devant la caisse.

Espèces : rejoignez la caisse derrière le bar et regardez son écran avec E.
La caisse s’ouvre directement, sans tablette, avec le ticket du client présent,
sa boisson, le pourboire et le total. Prenez les espèces depuis cet écran.
Choisissez les pièces et billets à rendre, validez le montant,
puis remettez la monnaie et le ticket au guichet. Un montant incorrect est refusé.
La caisse commence avec 80 euros, inclus dans les 260 euros de trésorerie initiale.
Vous pouvez alimenter son tiroir depuis la trésorerie disponible hors caisse.

Carte : prenez le terminal sans fil sur son socle près de la caisse, ou avec
le bouton de la caisse, et présentez-le au client arrivé au guichet. Vous pouvez
utiliser l’écran de caisse ou regarder le client avec E ou un clic.
La validation prend trois secondes ; les paiements à table sont indisponibles.
Vous gardez le terminal jusqu’à son retour sur le socle. Les recettes et la
progression sont comptées à la confirmation du règlement, sans double paiement.
Le terminal affiche le montant et l’état du paiement. Son écran, son clavier
numérique, ses touches de validation et son socle de recharge sont modélisés.
Les déplacements vers la caisse, la file, les commandes, encaissements en cours
et tâches des employés sont sauvegardés. La caisse ouverte laisse avancer le
service et la file ; Échap et les réglages mettent toujours le jeu en pause.
Le bilan du soir attend la fin des commandes et des paiements.

RÉSERVE ET STOCKS
La porte de la réserve se trouve à gauche, derrière le bar. Entrez dans la
pièce et appuyez sur E pour gérer les stocks. Les achats arrivent dans la
réserve après 10 secondes de jeu ; transférez ensuite les ingrédients vers
le comptoir depuis cette pièce. La tablette distingue ces deux stocks.
Une nouvelle partie commence avec un lot de chaque ingrédient de base en réserve.
Le whisky, le gin, le tonic, le cola, la vodka, le jus de cranberry et la boisson
énergisante sont à commander après l’achat de leur licence. Ils sont rangés
dans la réserve et disposent de bouteilles étiquetées derrière le bar.
Les anciennes sauvegardes conservent leur stock au comptoir et commencent
avec une réserve vide : aucun ingrédient existant n’est perdu.

AGRANDIR LE BAR
Dans Tab > Bâtiment, achetez deux extensions successives de 27 m², puis
les tables à installer dans chaque salle. Les travaux se font entre deux
services : fermez le bar et terminez les commandes et encaissements en cours.
Premier agrandissement : 20 clients encaissés et 450 euros.
Table 5 : 20 clients et 130 euros, après le premier agrandissement.
Table 6 : 30 clients et 160 euros, après l’achat de la table 5.
Deuxième agrandissement : 55 clients et 900 euros, après la table 6.
Table 7 : 55 clients et 180 euros, après le deuxième agrandissement.
Table 8 : 75 clients et 220 euros, après l’achat de la table 7.
Les nouvelles portes donnent accès à des salles meublées au fil des achats.
Chaque table achetée ajoute une place client : quatre tables au départ,
huit après les salons, douze avec l’étage et seize avec le club. Le bâtiment
complet accueille jusqu’à vingt-deux clients avec les six places du comptoir.
La fréquentation initiale reste inchangée. Un agrandissement vide ne crée
aucune place supplémentaire et aucun achat ne fait apparaître de clients.
Les clients et le serveur utilisent les nouvelles salles pour les commandes
et le service. Les clients reviennent à la caisse pour payer. Achats, clients
et position sont sauvegardés.

ÉTAGE ET BOÎTE DE NUIT
Étage panoramique : 110 clients encaissés et 1 800 euros, après le deuxième
agrandissement et la table 8. Il ajoute 54 m² à l’étage et un escalier de 18 m²,
pour une surface totale de 246 m². L’escalier se rejoint au fond des annexes ;
montez et descendez à pied pour servir les tables ; les clients redescendent
ensuite à la caisse pour régler.
Tables 9 à 12 : achats successifs à 200, 220, 240 et 260 euros, après
respectivement 110, 125, 140 et 155 clients encaissés.
Boîte de nuit : 180 clients encaissés et 2 600 euros, après l’achat de l’étage.
Elle ajoute 48 m² au rez-de-chaussée, au-delà de l’escalier, pour un total de
294 m². Elle comprend une piste, une cabine DJ et quatre emplacements de tables.
Tables 13 à 16 : achats successifs à 240, 260, 280 et 300 euros, après
respectivement 180, 195, 210 et 225 clients encaissés.
Les bâtiments et les tables s’achètent séparément, bar fermé. Une salle vide
ne crée pas de clients. Service distingue les tables du rez-de-chaussée,
de l’étage et du club. Vous devez être au même étage et à portée pour agir.
Toutes les boissons, y compris celles du club, se préparent derrière le bar
principal. La tablette sert à noter et consulter les commandes et à gérer le bar.

PROGRESSION SUR LA TABLETTE
Plateau de 4 boissons : 5 clients servis et 100 euros.
Licence cocktails : 8 clients servis et 120 euros, pour débloquer le mojito.
Licence sans alcool : 12 clients servis et 90 euros, pour le virgin mojito
et la limonade maison.
Licence spiritueux : 20 clients servis et 210 euros, pour le whisky sur glace
et le gin tonic, ainsi que leurs ingrédients chez le fournisseur.
Licence créations maison : 36 clients servis et 360 euros, après l’achat des
licences cocktails et spiritueux, pour le gin fizz et le cuba libre.
Licence cocktails classiques : 45 clients encaissés et 260 euros, après le
premier agrandissement et les licences cocktails et spiritueux ; daiquiri et
whisky highball, avec les ingrédients déjà présents au bar.
Licence vodka et jus : 80 clients encaissés et 380 euros, après le deuxième
agrandissement et la licence spiritueux ; vodka tonic et vodka cranberry.
Licence cocktails de nuit : 190 clients encaissés et 600 euros, après la boîte
de nuit et la licence vodka et jus ; vodka energy et Nuit Pourpre. Ces deux
cocktails sont commandés exclusivement par les clients du club.
Les licences s’achètent dans Tab > Licences. Chaque carte indique les boissons,
le prix, le nombre de clients requis et les licences préalables éventuelles.
Une boisson verrouillée propose un lien vers sa licence. Les achats sont
définitifs ; les ingrédients restent à payer et à transférer depuis la réserve.
Les clients commandent les nouvelles boissons seulement après leur déblocage.
Agrandissement du comptoir : 12 clients servis et 180 euros, pour augmenter
de 50 % sa capacité de stockage des ingrédients.
Assistant de réserve : 18 clients servis et 220 euros. Il réapprovisionne
automatiquement le comptoir depuis la réserve toutes les 12 secondes
pendant le service et coûte 10 euros de salaire par soir.
Préparateur de boissons : 24 clients encaissés et 300 euros, puis 18 euros par soir.
Il prépare les commandes prises en consommant les ingrédients du comptoir et
dépose les boissons sur le plateau, dans la limite de sa capacité.
Serveur : 32 clients encaissés et 380 euros, puis 22 euros par soir. Il prend les
commandes à table, apporte les boissons et encaisse les espèces et les cartes.
Pour les espèces, il attend le client au guichet, compte la monnaie et la lui remet
depuis le côté barman de la caisse.
Si nécessaire, il alimente le tiroir depuis la trésorerie disponible ; si elle
ne suffit pas, il attend de la monnaie et continue les autres tâches possibles.
Pour les cartes, il prend le terminal partagé, attend l’autorisation puis le
rapporte sur son socle. Reposez le terminal si vous le portez pour le lui laisser.
Un paiement pris en charge par le serveur ne peut pas être encaissé deux fois.
Les serveurs déjà recrutés bénéficient de ces fonctions et les tâches en cours
sont conservées en sauvegarde, y compris le transport du terminal et de la monnaie.
Responsable de salle : 85 clients, 650 euros, au moins 174 m² et un serveur
recruté ; salaire de 30 euros par soir. Le serveur se déplace 25 % plus vite
et la patience des clients diminue 20 % moins vite.
Second préparateur : 120 clients, 700 euros, au moins 246 m², l’étage et le
premier préparateur ; salaire de 26 euros par soir. Il prépare une autre
commande en parallèle, en partageant les stocks et la capacité du plateau.
DJ résident : 200 clients, 850 euros, au moins 294 m², le club et sa licence
de cocktails ; salaire de 35 euros par soir. Les boissons servies au club
rapportent 1 euro de pourboire supplémentaire et le délai entre les arrivées
de clients diminue de 15 %. Il diffuse une ambiance rythmique instrumentale
créée dans le jeu, plus discrète hors du club. Son niveau suit le volume
d’ambiance ; la pause et le mode muet interrompent la musique.
Agent d’accueil : 210 clients, 550 euros, au moins 294 m² et le club ; salaire
de 24 euros par soir. La patience baisse 15 % moins vite, en complément du
responsable de salle. La rubrique Équipe affiche la masse salariale totale,
la surface requise et les prérequis avant chaque recrutement.
Les anciennes sauvegardes gardent l’accès aux cocktails.
Elles conservent aussi leur argent, stocks, employés, commandes et préparations.
Les licences non possédées restent à acheter et les nouveaux stocks
commencent à zéro : charger une ancienne partie ne donne aucun lot gratuit.

DÉCORATION DU BAR
Dans Tab > Décoration, personnalisez les tables, les chaises et tabourets,
les murs, le plafond et le sol. Les finitions proposent différents matériaux
et couleurs. Le prix et la progression nécessaire figurent sur chaque carte.
Une finition est payée une seule fois ; réappliquer une finition possédée
est gratuit. Les changements se font bar fermé, après le départ des clients.
Le décor s’applique aussi aux salles agrandies et à l’étage, et se conserve
dans la sauvegarde. Le club reprend vos tables et sièges ; sa piste, ses murs
et son plafond conservent leur ambiance nocturne dédiée.
Les anciennes parties retrouvent leur décoration classique gratuitement.

MANETTE ET COMMANDES PERSONNALISÉES
Branchez une manette compatible avec la disposition standard Windows
(Xbox ou équivalente), puis appuyez sur un bouton.
Le stick gauche déplace le personnage et le droit tourne la caméra.
Par défaut : A pour interagir, Y pour la tablette, X pour gérer une préparation,
RT maintenu pour verser, clic du stick gauche pour courir et Menu pour la pause.
Dans les menus, A valide et B revient en arrière ; la croix directionnelle
ou le stick gauche choisit les éléments, les épaules passent d’un élément
au suivant et le stick droit fait défiler les longues pages.
Les champs de caisse et les réglages peuvent aussi être modifiés à la manette.
Réglages permet de réassigner les boutons de jeu et les touches clavier,
y compris Interagir, Tablette et Gérer. Échap et F11 restent réservés.
La sensibilité, la zone morte et l’inversion verticale des sticks se règlent
séparément de la souris. Les réglages sont conservés entre les sessions.
Les raccourcis indiqués plus haut correspondent aux valeurs par défaut.
La déconnexion d’une manette utilisée arrête les actions et met le jeu en pause.

MENU DE PAUSE
Échap range d’abord la tablette si elle est ouverte. Une fois la tablette
rangée, Échap arrête le temps et ouvre le menu : Reprendre la partie, Sauvegarder,
Charger une sauvegarde, Réglages, Retour au menu principal ou Retour au bureau.
Échap depuis ce menu reprend la partie. Le retour au menu principal ou au
bureau enregistre la progression actuelle.
Dans les paramètres, « Revenir au jeu » reprend immédiatement la partie et la caméra.
Échap revient à l’écran depuis lequel les paramètres ont été ouverts.

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
restent stylisés, avec des visages modelés : yeux, iris, pupilles, paupières,
sourcils, nez, lèvres, oreilles et coiffures variées.
Les silhouettes ont des épaules inclinées, un torse et une taille modelés.
Les vitrages et parois de verre laissent voir le décor derrière eux ; le niveau
des boissons suit le dosage et les cocktails reçoivent glaçons et garnitures.
Le comptoir en pierre, le métal brossé, le parquet et les tissus ont des rendus
distincts. La lumière de la rue baisse pendant le service, tandis que les
suspensions gardent le bar éclairé pendant toute la nuit.
Les clients arrivent et repartent en marchant,
rejoignent leur siège puis la caisse, et bloquent le passage lorsqu’ils attendent.
La rue se prolonge des deux côtés du bâtiment : trottoirs et bordures continus,
façades en volume, vitrines, stores, lampadaires, marquages et voitures garées.
Les façades lointaines se fondent dans l’atmosphère pour éviter une coupure nette
en regardant de biais depuis les fenêtres du bar ou de l’étage.
Le moniteur de caisse affiche un ticket lisible avec la boisson, le total et
l’état du règlement. Son écran est abaissé pour garder le client visible.
Les chaises font face aux tables et la machine à café laisse un espace
distinct pour la tasse en préparation, sans tasse superposée.
Les montants des chaises sont placés derrière le dossier. Les étiquettes,
enseignes et menus du décor gardent les proportions du texte et une taille
adaptée au panneau ; les étiquettes de la réserve sont plus contrastées.
La souris et les flèches suivent le sens du regard : gauche vers gauche.

VÉRIFICATIONS DU RENDU
npm test inclut les contrôles du rangement des textures de panneaux et de
la géométrie mise en cache, en plus du moteur, des sauvegardes et du build.
electron checks/hud.cjs vérifie l’interface, la progression de la journée
et les interactions avec le panneau d’entrée dans une fenêtre masquée.
node --test checks/developer-engine.cjs checks/service-engine.cjs contrôle
les outils développeur, la durée du service et les encaissements.
electron checks/developer-ui.cjs vérifie l’activation, les actions développeur
et leur sauvegarde depuis les réglages, au clavier et à la manette.
electron checks/menus.cjs contrôle la pause, le retour des réglages et
les sauvegardes, y compris la fin du service après 4 h du matin.
electron checks/licenses-ui.cjs contrôle les achats de licences, les six nouvelles
recettes et le chargement d’une sauvegarde antérieure.
electron checks/preparation-ui.cjs vérifie les dix recettes par interactions
E/clic, les déplacements réels dans l’allée, les stocks et le refus à distance.
electron checks/direct-service.cjs vérifie le service et les paiements directs,
le comptage à la caisse et le terminal, sans ouvrir la tablette.
electron checks/checkout-ui.cjs contrôle la file devant la caisse, son déplacement
pendant la consultation du ticket, les règlements au guichet et leur sauvegarde.
electron checks/waiter-payments-ui.cjs vérifie les encaissements du serveur,
le partage du terminal, les sauvegardes et les commandes disponibles au joueur.
electron checks/crowd-ui.cjs vérifie les six tabourets, les paliers d’affluence,
les interactions et la sauvegarde d’une salle de dix clients avec trois employés.
electron checks/graphics.cjs vérifie la transparence des vitrages, leur profondeur,
la lumière du jour et de nuit, et mesure le rendu avec dix personnages.
electron checks/visual-preview.cjs produit les aperçus du bar, du panneau
et des visages dans checks/artifacts, sans modifier le profil du joueur.
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
Il vérifie les dépendances déjà installées et les réutilise si elles correspondent
au verrouillage. Il lance npm ci seulement si elles manquent ou ont changé.
Les avertissements npm « deprecated » signalent des bibliothèques anciennes
utilisées par les outils Electron ; ils peuvent encore apparaître lors d’une
installation des dépendances. Une erreur d’installation arrête la fabrication.
Le numéro de version augmente automatiquement à chaque compilation réussie,
sans modifier package.json ni package-lock.json. Il est injecté uniquement dans
l’application compilée. Le dernier numéro est conservé dans .build/release-version.json,
un fichier local ignoré par Git, et dans release-final/latest.yml.
Le champ version de package.json est une base, pas le numéro du dernier installateur.
L’installation et la mise à jour conservent exactement le numéro de l’installateur :
elles ne l’augmentent pas. Avec npm start, les réglages indiquent la version de base
du projet en développement ; dans le jeu installé, ils indiquent sa version réelle.
La nouvelle version disponible s’installe à la fermeture normale du jeu.
Après un build réussi et vérifié, les anciennes versions et leurs fichiers de
compilation sont supprimés automatiquement. Seuls le build actuel et ses fichiers
de mise à jour restent dans release-final. En cas d’échec de compilation ou de
vérification, le précédent installateur reste disponible.
Un fichier ancien impossible à supprimer est signalé et le nettoyage est retenté
au prochain build réussi. Les sauvegardes, sources, dépendances et caches sont conservés.
