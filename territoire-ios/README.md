# TMS pour iPhone — avec la Brother PT-P710BT

Une seule app sur l'écran d'accueil : **TMS**. Elle affiche le site TMS
(`TMSBaseURL` dans App/Info.plist, https://tms.cteillet.fr) et imprime les
étiquettes d'attribution sur la PT-P710BT, sans passer par Safari ni par une
autre app. Elle remplace TMS Impression (versions 1.x), dont elle reprend
l'identifiant : Sideloadly l'installe par-dessus.

Les écrans de TMS viennent du site : un déploiement du front suffit à les mettre
à jour, sans réinstaller l'app. L'app n'ajoute que ce qu'un navigateur ne sait pas
faire sur iPhone, c'est-à-dire parler à l'imprimante en Bluetooth.

**Validation matérielle du 3 novembre 2026 :** la version 1.0, installée depuis
Windows avec Sideloadly, a imprimé l'étiquette de test sur la PT-P710BT. La liaison
native et l'impression sont donc validées sur cet équipement. Le parcours avec le
nom et la date de l'attribution (depuis la 1.1) et les versions 2.x doivent encore
être essayés sur le téléphone.

L'impression utilise l'API publique Apple External Accessory et une adaptation du
protocole raster de territoire-front/lib/ptouch.ts. Aucun SDK Brother privé,
serveur d'impression ou abonnement Apple payant n'est requis. À l'utilisation,
seuls l'iPhone, l'imprimante et l'accès à TMS sont nécessaires ; le PC sert à
signer et renouveler l'installation.

## Utiliser l'app

1. Installer l'IPA avec Sideloadly (voir plus bas), avec le même compte Apple que
   TMS Impression s'il était installé.
2. Ouvrir **TMS** et se connecter avec son compte TMS. La session reste ouverte
   d'un lancement à l'autre, comme dans Safari ; elle est propre à l'app (se
   connecter dans Safari ne connecte pas l'app).
3. Après une attribution, classique ou depuis une demande, une carte **Étiquette
   prête à imprimer** propose **Imprimer**. L'app se connecte à la PT-P710BT et
   imprime le prénom, l'initiale du nom et la date de retour sur le ruban TZe
   détecté. TMS affiche le résultat : étiquette imprimée, ou ce qui l'empêche avec
   **Réessayer** et **Imprimante**.
4. Dans **Paramètres > Autres paramètres > Imprimante d'étiquettes** : étiquette de
   test, **Réglages de l'imprimante** et **Imprimer l'étiquette à chaque attribution
   faite depuis cet appareil**, qui imprime sans passer par la carte. Ce réglage est
   propre à l'app.
5. La fiche du territoire réimprime l'étiquette de l'attribution en cours, avec son
   échéance actuelle.

Une campagne sans personne ne génère aucune étiquette. L'écran **Imprimante**
(Réglages de l'imprimante) sert à appairer la P710BT, choisir entre plusieurs
imprimantes visibles, vérifier la connexion et partager un diagnostic ; le fermer
pour revenir à TMS.

Les liens `tmsprint` envoyés depuis Safari ou une PWA (option **Utiliser l'app TMS
Impression sur cet iPhone**) ouvrent l'écran Imprimante, comme avec TMS Impression.
Son option **Imprimer automatiquement les liens venus de Safari** évite d'y
confirmer chaque étiquette.

## Ce que l'app fait du site

- Les pages de TMS restent dans l'app ; retour arrière par glissement depuis le bord.
- Les itinéraires (Google Maps, Plans, Waze) et les autres sites s'ouvrent dans leur
  app ou dans Safari. Les liens vers une autre app que Téléphone, Messages, Mail ou
  Plans sont ignorés.
- Les fichiers téléchargés (export Excel d'une campagne, étiquette LBX…) ouvrent la
  feuille de partage d'iOS : Enregistrer dans Fichiers, AirDrop, Design&Print 2…
- La carte d'un territoire s'ouvre dans une fenêtre avec un bouton Fermer. Un appui
  long sur l'image permet de l'enregistrer.
- L'import de fichiers (.vcf, .xlsx, photo de la carte) passe par le sélecteur
  d'iOS. La position sur la carte demande l'autorisation de localisation.
- Si TMS est injoignable, un écran propose de réessayer et donne accès à l'écran
  Imprimante.

Le service worker du site n'est pas actif dans l'app (il faudrait déclarer les
domaines de l'app à iOS) : il ne servait qu'au cache du logo et du manifeste.

## Pont entre la page TMS et l'app

Dans l'app, le front détecte `window.webkit.messageHandlers.tmsPrinter`
(territoire-front/lib/native-app.ts) ; ce pont n'existe pas dans Safari. Messages :

    { action: "print", id: "<UUID>", name: "Corentin T.", dueDate: "2027-03-03" }
    { action: "openSettings" }

Une impression répond `{ printed: true }` une fois la fin d'impression confirmée par
la P710BT, sinon `{ printed: false, message }` avec le message affiché par TMS
(imprimante occupée, absente, erreur, ou résultat incertain à vérifier). Le nom et la
date suivent les mêmes règles que le lien ci-dessous, et l'identifiant entre dans le
même historique contre les doublons : chaque toucher de « Imprimer » ou « Réessayer »
crée un nouveau travail, jamais relancé automatiquement.

L'app n'accepte ces messages que de la page principale, à l'origine exacte de
`TMSBaseURL` : ni d'un cadre intégré, ni d'une fenêtre ouverte par la page, ni d'un
autre site. Le message ne contient aucune commande d'imprimante.

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

1. Ouvrir le workflow **iOS - App TMS** dans les Actions du dépôt.
2. Choisir une exécution réussie correspondant à la branche voulue.
3. Dans **Artifacts**, télécharger **tms-ios-unsigned**.
4. Décompresser cette archive : elle contient **TMS-unsigned.ipa**,
   son empreinte SHA-256, le journal de compilation et ce mode d'emploi.

Les modifications de ce dossier déclenchent une compilation sur un runner macOS.
Le workflow utilise uniquement des permissions de lecture et ne demande aucun
certificat, secret Apple ou clé de signature.

Le bouton Run workflow devient disponible lorsque le workflow est présent sur la
branche par défaut. Avant cela, un push sur une branche de travail le déclenche
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
6. Ouvrir **TMS**.

Une mise à jour s'installe de la même façon, par-dessus la version en place : la
session TMS et les réglages de l'app sont conservés. TMS Impression 1.x est
remplacée, pas dupliquée, car l'identifiant de l'app est le même.

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
3. Ouvrir l'écran Imprimante : dans TMS, **Paramètres > Autres paramètres >
   Imprimante d'étiquettes**, option de l'app cochée, toucher **Essayer TMS Impression**.
   Accepter l'accès Bluetooth si demandé, puis **Actualiser**.
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

Le rapport contient la version de l'app, le modèle/firmware, les protocoles,
les événements des flux et les octets de diagnostic. Il n'inclut ni compte Apple,
ni identifiant TMS, ni numéro de série de l'imprimante.

## Protocole MFi : ce que l'app vérifie

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
cette app ne valide pas une future autorisation de distribution.

## Développement et vérifications

Les tests du dossier Core ne simulent pas un succès matériel. Ils contrôlent le
découpage des trames reçues, les erreurs et médias, l'orientation des points et le
décodage indépendant du flux raster complet. Ils vérifient aussi la politique de
navigation de la vue web (pages TMS gardées, liens externes, contenus générés,
liens bloqués) et les noms des fichiers téléchargés.

Sur un Mac équipé de Xcode et XcodeGen :

    cd territoire-ios
    swift test
    bash scripts/build-ipa.sh

Le runner effectue ces mêmes vérifications et compile pour iphoneos, pas seulement
pour le simulateur. Un simulateur ne permet pas de tester la connexion physique.

Les tests Swift couvrent aussi le contrat des liens web, les messages du pont et
l'origine acceptée, les entrées invalides et l'historique contre les doublons. Les
tests frontend contrôlent le lien Unicode, la date du backend, l'impression par le
pont simulé, les réglages iOS, la carte après attribution et le repli LBX.
La compilation ne remplace ni l'essai matériel, ni celui du site dans l'app :
connexion, carte et position, imports et exports de fichiers, liens d'itinéraire.

## Références

- [Apple — External Accessory](https://developer.apple.com/documentation/externalaccessory)
- [Apple — Protocoles déclarés par une app](https://developer.apple.com/documentation/bundleresources/information-property-list/uisupportedexternalaccessoryprotocols)
- [Brother — Configuration iOS, protocole et PPID](https://support.brother.com/g/s/es/htmldoc/mobilesdk/guide/getting-started/getting-started-ios.html)
- [Brother — Modèles et prise en charge sur demande](https://support.brother.com/g/s/es/htmldoc/mobilesdk/reference/ios_v4/brlmprinterdefine.html)
- [Apple — Comptes personnels et expiration des profils](https://developer.apple.com/help/account/basics/about-your-developer-account)
- [Sideloadly — Installation et renouvellement](https://sideloadly.io/faq.html)
