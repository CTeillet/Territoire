# TMS Impression — iPhone et Brother PT-P710BT

App native autonome qui reçoit une étiquette depuis TMS, se connecte à la
PT-P710BT et l'imprime. Les outils de diagnostic restent disponibles.

**Validation matérielle du 3 novembre 2026 :** l'utilisateur a installé la
version 1.0 depuis Windows avec Sideloadly et confirme avoir imprimé l'étiquette
de test sur sa PT-P710BT. La liaison native et l'impression sont donc validées
sur cet équipement. Le parcours TMS avec texte variable ajouté en 1.1 doit
encore être essayé sur le téléphone après installation et déploiement du web.

Il utilise l'API publique Apple External Accessory et une adaptation du protocole
raster déjà présent dans territoire-front/lib/ptouch.ts. Aucun SDK Brother privé,
serveur d'impression, compte TMS ou abonnement Apple payant n'est requis pour
construire le fichier non signé. L'installation et l'accès matériel sont ensuite
deux validations distinctes. À l'utilisation, seuls l'iPhone et l'imprimante
sont nécessaires ; le PC sert à signer et renouveler l'installation.

## Utiliser la version 1.1 depuis TMS

1. Télécharger le nouvel IPA de cette branche et le réinstaller avec Sideloadly,
   avec le même compte Apple. Son nom sur l'écran d'accueil devient
   **TMS Impression** ; le bundle identifier reste identique à celui du diagnostic.
2. Dans l'app, activer **Imprimer automatiquement les demandes TMS** si souhaité.
   Par défaut, un bouton permet de vérifier le nom et la date avant d'imprimer.
3. Avec la version web de cette branche déployée, ouvrir TMS sur l'iPhone,
   **Paramètres > Autres paramètres > Imprimante d'étiquettes**, puis cocher
   **Utiliser l'app TMS Impression sur cet iPhone**. Ce choix est local au navigateur.
4. Après une attribution réussie, toucher **Imprimer** dans la carte d'étiquette.
   iOS peut demander de confirmer l'ouverture de l'app. Celle-ci reçoit le prénom,
   l'initiale du nom et la date de retour renvoyée par le backend, ouvre la connexion
   et imprime sur le ruban TZe détecté. Garder l'app au premier plan jusqu'à la fin.
5. Revenir dans TMS avec le retour d'iOS ou le sélecteur d'apps.

Le parcours couvre les attributions classiques, celles depuis une demande et la
réimpression depuis l'historique du territoire. Une campagne sans personne ne
génère aucune étiquette. Les paramètres proposent aussi un test avec un nom et
une date, et le téléchargement LBX reste disponible.

Le bouton est un lien réellement touché par l'utilisateur : le navigateur ne
tente pas d'ouvrir une app depuis le retour d'une requête d'attribution asynchrone.
TMS ne peut ni détecter l'installation ou l'expiration de la signature de l'app,
ni annoncer une impression réussie : le résultat est affiché dans l'app native.
Le choix LBX reste actif par défaut tant que l'app native n'a pas été choisie.

## Contrat du lien web → iOS

Format versionné, avec les valeurs encodées par `encodeURIComponent` :

    tmsprint://print?v=1&id=<UUID>&name=Corentin%20T.&dueDate=2027-03-03

La date est un jour calendrier `AAAA-MM-JJ`, sans conversion de fuseau horaire.
Le rendu iOS est local, sur deux lignes, avec accents, nom en gras et date de retour.
Le lien ne contient aucun jeton de connexion, nom complet, URL à télécharger ou
commande d'imprimante. Le parseur refuse les versions inconnues, paramètres
supplémentaires ou répétés, dates invalides, caractères de contrôle et textes trop longs.

Un schéma d'URL personnalisé ne permet pas d'authentifier le site d'origine :
l'impression automatique est donc désactivée à l'installation. L'option dans
l'app explique qu'un lien `tmsprint` peut lancer une étiquette sans confirmation.

Les 200 derniers identifiants de travaux envoyés sont mémorisés avant l'envoi.
Rouvrir le même lien ne répète pas le travail, même après un redémarrage de l'app.
Une erreur avant envoi permet de réessayer manuellement dans l'app ; après un
envoi partiel ou une fin non confirmée, vérifier la sortie physique et redemander
une nouvelle étiquette depuis TMS si nécessaire. Aucun travail envoyé n'est relancé
automatiquement. Plusieurs P710BT visibles demandent une sélection manuelle.

## Obtenir le fichier d'installation sans Mac

1. Ouvrir le workflow **iOS - Diagnostic P710BT** dans les Actions du dépôt.
2. Choisir une exécution réussie correspondant à la branche du prototype.
3. Dans **Artifacts**, télécharger **p710bt-diagnostic-ios-unsigned**.
4. Décompresser cette archive : elle contient **TMSPrinterDiagnostic-unsigned.ipa**,
   son empreinte SHA-256, le journal de compilation et ce mode d'emploi.

Les modifications de ce dossier déclenchent une compilation sur un runner macOS.
Le workflow utilise uniquement des permissions de lecture et ne demande aucun
certificat, secret Apple ou clé de signature.

Le bouton Run workflow devient disponible lorsque le workflow est présent sur la
branche par défaut. Avant cela, un push sur la branche du prototype le déclenche
également.

## Installer depuis Windows avec un compte Apple gratuit

Le fichier IPA produit n'est pas directement installable : il doit être signé pour
ton appareil avec ton propre compte Apple.

1. Installer [Sideloadly](https://sideloadly.io/) depuis son site officiel et suivre
   ses indications pour les composants Apple requis sous Windows.
2. Brancher l'iPhone en USB, le déverrouiller et accepter de faire confiance au PC.
3. Ouvrir Sideloadly, sélectionner l'iPhone et le fichier IPA, puis effectuer la
   signature/installation avec ton compte Apple dans l'outil.
4. Sur l'iPhone, autoriser le développeur dans Réglages > Général > VPN et gestion
   de l'appareil si iOS le demande.
5. Activer le Mode développeur dans Réglages > Confidentialité et sécurité, puis
   redémarrer si demandé (iOS 16 et suivants).
6. Ouvrir **TMS Impression**.

[AltStore Classic pour Windows](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows)
est une autre possibilité de signature/installation.

Avec un compte gratuit, les profils expirent après **7 jours** et Apple limite le
nombre d'apps personnelles installées simultanément. Prévoir le renouvellement
avec l'outil choisi, par USB ou sur le même réseau Wi-Fi lorsque son mécanisme le
permet. Le PC sert à l'installation/au renouvellement, pas à l'impression.

## Premier essai sur l'iPhone

1. Allumer la PT-P710BT et vérifier qu'elle fonctionne avec l'app Brother utilisée
   pour la V1 LBX. Puis fermer Design&Print 2 et iPrint&Label pour libérer la liaison.
2. Dans Réglages > Bluetooth, appairer la PT-P710BT avec l'iPhone.
3. Ouvrir le prototype, accepter l'accès Bluetooth si demandé, puis **Actualiser**.
   Le bouton **Appairer…** présente aussi le sélecteur Apple.
4. Sélectionner la P710BT et examiner le modèle et les protocoles affichés.
5. Toucher **Ouvrir la connexion**, puis **Lire l'état — sans imprimer**.
6. Si une réponse Brother est reçue, le diagnostic affiche la largeur de ruban et
   les éventuelles erreurs. C'est une preuve de communication sur cette session.
7. Facultativement, toucher **Imprimer une étiquette de test…**, puis confirmer.
   Une étiquette pixelisée **TMS TEST / P710BT** d'environ 40 mm (plus la marge
   mécanique de l'imprimante) est envoyée, sur le ruban TZe détecté. Le texte est
   volontairement simple pour tester le transport, sans dépendre d'une police.
8. **Partager le diagnostic** permet de copier ou d'enregistrer le rapport.

Une demande d'état seule ne comporte aucune instruction d'avance, de coupe ou
d'impression. Si les flux s'ouvrent mais restent sans réponse, reconnecter puis
essayer, dans **Diagnostic avancé**, la lecture avec initialisation raster. Celle-ci
vide le tampon de l'imprimante : attendre la fin de tout autre travail avant de la
confirmer.

La session est fermée lorsque l'app passe en arrière-plan. Aucune impression n'est
relancée automatiquement, notamment après un échec ou une absence de confirmation.

## Comprendre les résultats

| Résultat | Conclusion possible |
| --- | --- |
| App installée | La compilation, la signature et l'installation fonctionnent. Le Bluetooth n'est pas encore validé. |
| Aucun accessoire visible | Vérifier l'appairage, l'autre app encore connectée, les protocoles déclarés et l'accès MFi. Cela ne prouve pas une incompatibilité. |
| Accessoire visible, pas de protocole commun | Le protocole annoncé ne correspond pas à ceux déclarés dans cette version de l'app. |
| Session créée, flux refusés ou fermés | Examiner les détails iOS du rapport ; une session existante ne suffit pas à valider la communication. |
| Réponse d'état Brother de 32 octets | La communication native fonctionne pour cette session et cette installation. |
| Étiquette sortie et fin d'impression reçue | L'essai d'impression de bout en bout est validé sur ton appareil. |
| Données envoyées, confirmation absente | Résultat incertain : vérifier l'étiquette avant un nouvel essai manuel. |

Le rapport contient la version du prototype, le modèle/firmware, les protocoles,
les événements des flux et les octets de diagnostic. Il n'inclut ni compte Apple,
ni identifiant TMS, ni numéro de série de l'imprimante.

## Protocole MFi : ce que ce prototype vérifie

La déclaration est **com.brother.ptcbp**, le protocole documenté dans le
guide iOS général de Brother. L'impression physique a été confirmée avec le build
1.0 qui déclarait ce protocole. Une déclaration dans Info.plist ne crée pas,
à elle seule, d'autorisation MFi.

L'app tente uniquement les protocoles à la fois annoncés par l'accessoire et
déclarés dans son propre Info.plist. Elle enregistre ces deux listes dans le
diagnostic. Si Brother confirme un autre nom de protocole, il faut reconstruire
l'app avec ce nom :

- Une fois le workflow sur la branche par défaut, renseigner **extra_protocols**
  lors d'une exécution manuelle (noms reverse-DNS séparés par des virgules).
- Sur une branche de travail, on peut aussi compléter la liste dans App/Info.plist
  et pousser le commit pour déclencher un nouveau build.

Le fabricant contrôle l'accès des apps aux accessoires MFi. Brother précise que
les modèles hors liste standard, dont la PT-P710BT, demandent une requête spéciale
pour la distribution d'applications. Le sideloading ne garantit pas cet accès et
ce prototype ne valide pas une future autorisation de distribution.

## Développement et vérifications

Les tests du dossier Core ne simulent pas un succès matériel. Ils contrôlent le
découpage des trames reçues, les erreurs et médias, l'orientation des points et le
décodage indépendant du flux raster complet.

Sur un Mac équipé de Xcode et XcodeGen :

    cd ios-printer-diagnostic
    swift test
    bash scripts/build-ipa.sh

Le runner effectue ces mêmes vérifications et compile pour iphoneos, pas seulement
pour le simulateur. Un simulateur ne permet pas de tester la connexion physique.

Les tests Swift couvrent aussi le contrat des liens web, les entrées invalides et
l'historique contre les doublons. Les tests frontend contrôlent le lien Unicode,
la date du backend, les réglages iOS, la carte après attribution et le repli LBX.
La compilation ne remplace pas l'essai matériel du parcours depuis Safari et
depuis une PWA ajoutée à l'écran d'accueil.

## Références

- [Apple — External Accessory](https://developer.apple.com/documentation/externalaccessory)
- [Apple — Protocoles déclarés par une app](https://developer.apple.com/documentation/bundleresources/information-property-list/uisupportedexternalaccessoryprotocols)
- [Brother — Configuration iOS, protocole et PPID](https://support.brother.com/g/s/es/htmldoc/mobilesdk/guide/getting-started/getting-started-ios.html)
- [Brother — Modèles et prise en charge sur demande](https://support.brother.com/g/s/es/htmldoc/mobilesdk/reference/ios_v4/brlmprinterdefine.html)
- [Apple — Comptes personnels et expiration des profils](https://developer.apple.com/help/account/basics/about-your-developer-account)
- [Sideloadly — Installation et renouvellement](https://sideloadly.io/faq.html)
