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
reprend la caméra pour la préparer directement dans le décor derrière le bar.
La tablette regroupe le service, les boissons, la caisse, les stocks, le bâtiment,
les licences et l’équipe. Le service continue pendant son utilisation.
Pour ouvrir le bar, approchez le panneau suspendu à la porte d’entrée et appuyez
sur E, ou utilisez Ouvrir le bar dans Service ou Boissons sur la tablette.
Un clic en regardant le panneau à proximité permet également de le tourner.
Le même panneau ou bouton lance la dernière tournée : les clients présents
doivent être servis et encaissés avant le bilan. Le panneau reflète cet état.
En haut à gauche, seuls le statut et le temps de jeu restant jusqu’à minuit
sont affichés, avec une barre d’avancement de 17 h à minuit.
Les stocks, améliorations et l’action Nouveau bar se consultent uniquement
dans la tablette ; Nouveau bar se trouve dans Bâtiment et demande confirmation.
Les indications de préparation apparaissent uniquement derrière le comptoir.
Choisissez une recette sur la tablette, prenez le récipient au rangement avec E,
puis posez-le au poste indiqué. Prenez les ingrédients dans les bouteilles et
bacs étiquetés avec E ou un clic, et apportez-les un par un au poste.
Restez près du poste pour maintenir la touche de dosage. Regardez le verre et
appuyez sur E pour valider, mélanger si nécessaire, puis prendre la boisson
sur le plateau. S’éloigner arrête le versement. Une préparation ne peut pas
être commencée ou poursuivie depuis une table. Pour l’abandonner, utilisez
Abandonner la préparation dans Tab > Boissons.
Les touches 1 à 4 ne sélectionnent plus les boissons.
Les ingrédients sont prélevés à la prise ; la bière au premier tirage.
Un ingrédient tenu et une préparation en cours sont conservés dans la sauvegarde.
Les anciennes préparations déjà payées restent utilisables sans nouveau débit.
35 euros de charges par soir, auxquels s’ajoutent les salaires des employés recrutés.
Une trésorerie négative termine la partie.
Le bouton Aide détaille les commandes et le fonctionnement.

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
commande. Revenez avec la boisson sur le plateau et interagissez de la même
façon pour servir automatiquement la bonne boisson. La tablette conserve
la liste des commandes, mais n’est pas nécessaire pour servir ou encaisser.
Après la dégustation, le client demande à payer en espèces ou par carte.

Espèces : prenez l’argent auprès du client, revenez à la caisse derrière le bar
et regardez son écran avec E. La caisse s’ouvre directement, sans tablette.
Choisissez les pièces et billets à rendre, validez le montant,
puis rapportez la monnaie et le ticket au client. Un montant incorrect est refusé.
La caisse commence avec 80 euros, inclus dans les 260 euros de trésorerie initiale.
Vous pouvez alimenter son tiroir depuis la trésorerie disponible hors caisse.

Carte : prenez le terminal sans fil sur son socle près de la caisse, rejoignez
le client et présentez-le avec E ou un clic. La validation prend trois secondes.
Vous gardez le terminal jusqu’à son retour sur le socle. Les recettes et la
progression sont comptées à la confirmation du règlement, sans double paiement.
Le terminal affiche le montant et l’état du paiement. Son écran, son clavier
numérique, ses touches de validation et son socle de recharge sont modélisés.
Les commandes, encaissements en cours et tâches des employés sont sauvegardés.
Le bilan du soir attend la fin des commandes et des paiements.

RÉSERVE ET STOCKS
La porte de la réserve se trouve à gauche, derrière le bar. Entrez dans la
pièce et appuyez sur E pour gérer les stocks. Les achats arrivent dans la
réserve après 10 secondes de jeu ; transférez ensuite les ingrédients vers
le comptoir depuis cette pièce. La tablette distingue ces deux stocks.
Une nouvelle partie commence avec un lot de chaque ingrédient de base en réserve.
Le whisky, le gin, le tonic et le cola sont à commander après l’achat de leur
licence. Ils sont rangés sur l’étagère latérale de la réserve.
Les anciennes sauvegardes conservent leur stock au comptoir et commencent
avec une réserve vide : aucun ingrédient existant n’est perdu.

PROGRESSION SUR LA TABLETTE
Plateau de 4 boissons : 5 clients servis et 100 euros.
Licence cocktails : 8 clients servis et 120 euros, pour débloquer le mojito.
Licence sans alcool : 12 clients servis et 90 euros, pour le virgin mojito
et la limonade maison.
Licence spiritueux : 20 clients servis et 210 euros, pour le whisky sur glace
et le gin tonic, ainsi que leurs ingrédients chez le fournisseur.
Licence créations maison : 36 clients servis et 360 euros, après l’achat des
licences cocktails et spiritueux, pour le gin fizz et le cuba libre.
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
Pour les espèces, il passe à la caisse, compte la monnaie et la rapporte au client.
Si nécessaire, il alimente le tiroir depuis la trésorerie disponible ; si elle
ne suffit pas, il attend de la monnaie et continue les autres tâches possibles.
Pour les cartes, il prend le terminal partagé, attend l’autorisation puis le
rapporte sur son socle. Reposez le terminal si vous le portez pour le lui laisser.
Un paiement pris en charge par le serveur ne peut pas être encaissé deux fois.
Les serveurs déjà recrutés bénéficient de ces fonctions et les tâches en cours
sont conservées en sauvegarde, y compris le transport du terminal et de la monnaie.
Les anciennes sauvegardes gardent l’accès aux cocktails.
Elles conservent aussi leur argent, stocks, employés, commandes et préparations.
Les trois nouvelles licences restent à acheter et les quatre nouveaux stocks
commencent à zéro : charger une ancienne partie ne donne aucun lot gratuit.

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
suspensions gardent le bar éclairé jusqu’à minuit.
Les clients arrivent et repartent en marchant,
conservent leur place au comptoir et bloquent le passage lorsqu'ils attendent.
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
electron checks/licenses-ui.cjs contrôle les achats de licences, les six nouvelles
recettes et le chargement d’une sauvegarde antérieure.
electron checks/preparation-ui.cjs vérifie les dix recettes par interactions
E/clic, les déplacements réels dans l’allée, les stocks et le refus à distance.
electron checks/direct-service.cjs vérifie le service et les paiements directs,
le comptage à la caisse et le terminal, sans ouvrir la tablette.
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
La nouvelle version disponible s’installe à la fermeture normale du jeu.
Après un build réussi et vérifié, les anciennes versions et leurs fichiers de
compilation sont supprimés automatiquement. Seuls le build actuel et ses fichiers
de mise à jour restent dans release-final. En cas d’échec de compilation ou de
vérification, le précédent installateur reste disponible.
Un fichier ancien impossible à supprimer est signalé et le nettoyage est retenté
au prochain build réussi. Les sauvegardes, sources, dépendances et caches sont conservés.
