# Diagnostic iPhone — Brother PT-P710BT

Petit prototype natif, autonome, pour tester la communication entre un véritable
iPhone et une PT-P710BT avant d'intégrer l'impression à TMS.

Il utilise l'API publique Apple External Accessory et une adaptation du protocole
raster déjà présent dans territoire-front/lib/ptouch.ts. Aucun SDK Brother privé,
serveur d'impression, compte TMS ou abonnement Apple payant n'est requis pour
construire le fichier non signé. L'installation et l'accès matériel sont ensuite
deux validations distinctes.

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
6. Ouvrir **Test P710BT**.

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

La déclaration initiale est **com.brother.ptcbp**, le protocole documenté dans le
guide iOS général de Brother. Elle n'a pas encore été confirmée sur cet exemplaire
de PT-P710BT. Une déclaration dans Info.plist ne crée pas d'autorisation MFi.

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

La validation matérielle doit être faite sur l'iPhone et la PT-P710BT. Tant que le
rapport et l'étiquette n'ont pas été observés, l'impression native reste une piste
à confirmer ; le prototype ne modifie pas le parcours TMS/LBX.

## Références

- [Apple — External Accessory](https://developer.apple.com/documentation/externalaccessory)
- [Apple — Protocoles déclarés par une app](https://developer.apple.com/documentation/bundleresources/information-property-list/uisupportedexternalaccessoryprotocols)
- [Brother — Configuration iOS, protocole et PPID](https://support.brother.com/g/s/es/htmldoc/mobilesdk/guide/getting-started/getting-started-ios.html)
- [Brother — Modèles et prise en charge sur demande](https://support.brother.com/g/s/es/htmldoc/mobilesdk/reference/ios_v4/brlmprinterdefine.html)
- [Apple — Comptes personnels et expiration des profils](https://developer.apple.com/help/account/basics/about-your-developer-account)
- [Sideloadly — Installation et renouvellement](https://sideloadly.io/faq.html)
