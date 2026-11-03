# Gestion de Territoires (TMS)

## Description
L'application permet d'attribuer, suivre et organiser la distribution de territoires composés de pâtés de maisons, de barres d'immeubles ou de certains numéros de rue. Elle assure la traçabilité des statuts et des attributions, avec authentification et gestion des utilisateurs.

## Fonctionnalités principales
- Gestion des territoires avec quatre statuts : **disponible, attribué, en attente, en retard**.
- Attribution d'un territoire à une personne (échéance à 4 mois), retour, prolongation et annulation.
- Passage automatique en retard et remise à disposition des territoires en attente (tâches de nuit).
- Rappels WhatsApp (via WAHA) pour les territoires en retard.
- Récapitulatif hebdomadaire par e-mail des territoires en retard (lundi 8 h) : personne, échéance, durée du retard et dernière relance. Destinataires dans Paramètres > Autres paramètres, avec un bouton d'envoi immédiat pour tester.
- Espace « mes territoires » : chaque personne reçoit un lien personnel (`/m/<jeton>`) pour consulter ses territoires en cours (carte, adresses à ne pas visiter) et les rendre elle-même. Envoi par WhatsApp, automatique à l'attribution si activé ; gestion (renvoi, régénération, révocation, expiration) dans Paramètres > Accès numériques et sur la fiche de chaque personne. Coexiste avec les cartes papier.
- Campagnes, statistiques, historique quotidien des statuts.
- Impression des cartes de territoires (Territoire > Impression des cartes) : on choisit les territoires (recherche, ville) et leurs cartes s'impriment par 4 sur des feuilles A4 en paysage, à découper en quarts. Les marges blanches des cartes numérisées sont retirées.
- Étiquettes d'attribution : une Brother P-touch Cube (PT-P300BT, PT-P710BT) reliée en Bluetooth imprime à chaque attribution une étiquette « Prénom N. / À rendre le JJ/MM/AAAA », à coller sur la carte. Elle se règle par appareil, cf. [Imprimante d'étiquettes](#imprimante-détiquettes-brother-p-touch) ; la fiche d'un territoire permet de réimprimer l'étiquette de l'attribution en cours. Sur iPhone et iPad, l'étiquette est un fichier `.lbx` à ouvrir dans l'application Brother P-touch Design&Print 2.
- Territoires perdus : un territoire dont la carte papier a disparu se signale « perdu » depuis ses actions (liste ou fiche), quel que soit son statut. La page d'impression les propose à la réimpression ; une fois les cartes imprimées, on les retire des perdus (ADMIN, SUPERVISEUR, GESTIONNAIRE).
- Export / import Excel, export PNG de la carte de tous les territoires, adresses à ne pas visiter.
- Rôles et droits d'accès :
  - **ADMIN** : accès total.
  - **SUPERVISEUR** : modification des territoires et des personnes, attribution et retour.
  - **GESTIONNAIRE** : attribution et retour de territoires.
  - **UTILISATEUR** : consultation uniquement.

## Architecture
| Dossier | Contenu |
| --- | --- |
| `territoire-back` | API REST Spring Boot 4 (Java 25), Spring Security + JWT, PostgreSQL/PostGIS, Hibernate, Flyway |
| `territoire-front` | Next.js 16 / React 19, TypeScript, Tailwind CSS, shadcn/ui, Redux Toolkit |
| `config` | Configuration de l'observabilité (OpenTelemetry, Prometheus, Loki, Tempo, Grafana) et image de sauvegarde de la base (`config/backup`) |
| `docker-compose.yml` | Déploiement complet (base, sauvegarde, API, front, observabilité). WAHA est hébergé à part (`waha.baseUrl`) |
| `docker-compose-mini.yml` | Environnement local : base PostGIS et observabilité, sans l'application |

### Base de données
Le schéma est géré par Flyway (`territoire-back/src/main/resources/db/migration`) : `V2__schema_complet.sql` décrit le schéma de production, et chaque changement (nouvelle colonne, nouvelle table, renommage...) ajoute une migration `V3__description.sql`, `V4__...`. Hibernate ne modifie plus la base : il vérifie au démarrage que chaque entité correspond aux tables (`ddl-auto=validate`) et l'application refuse de démarrer sinon.

Une entité modifiée sans migration est détectée en CI par `FlywayValidateIntegrationTest`, qui démarre l'application sur une copie du schéma de production (`src/test/resources/db/schema-production.sql`) dans un conteneur PostGIS. `FlywaySchemaIntegrationTest` vérifie que les migrations ne changent rien à ce schéma et le recréent à l'identique sur une base vide.

## Développement local
Prérequis : Docker, Java 25, Node.js 24.

```bash
# Base PostGIS locale (utilisateur admin / base territoire)
docker compose up -d postgis
```

Backend (profil `local`, cookies sans HTTPS) :
```bash
cd territoire-back
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```
Variables attendues : `JWT_SECRET_KEY` (clé base64), `WAHA_API_KEY_PLAIN_TEXT`, et en option `ACCESS_LINK_SECRET` (clé des liens personnels, sinon dérivée de `JWT_SECRET_KEY`) et `INTEGRATIONS_API_KEY` (tuile Homepage, cf. [Intégrations](#intégrations-tuile-homepage)).

Frontend (port 40000) :
```bash
cd territoire-front
npm ci
npm run dev
```
Les appels `/api` du front sont redirigés vers le back local `http://localhost:8080` (autre adresse : `API_URL` dans `.env.local`). En production, nginx envoie `/api/` directement au back.

Tests :
```bash
cd territoire-back && ./mvnw test
cd territoire-front && npm test
```

## Déploiement
La CI (`.github/workflows`) lance lint et tests. Sur master, le workflow `Build and Deploy` prend ensuite le relais :
- chaque image est taguée par le dernier commit qui a modifié son dossier (`territoire-back`, `territoire-front`) et n'est construite que si ce tag manque sur GitHub Container Registry : un changement jamais déployé (CI en échec, run remplacé par un plus récent) part avec le déploiement suivant ;
- un run dont le commit n'est plus le dernier de master ne déploie rien : les CI ne finissent pas forcément dans l'ordre des merges ;
- sur le VPS, `deploy/deploy.sh` met en place `docker-compose.yml` et `config/`, fait pointer `latest` sur les images à déployer et lance `docker compose up -d` : seuls les services modifiés sont recréés, PostGIS reste en place. Il attend ensuite que le back et le front soient en bonne santé ; sinon il remet les images précédentes et le workflow échoue.

`latest` désigne donc la version en production, sur le VPS comme sur GHCR. Lancé à la main depuis l'onglet Actions, le workflow redéploie la dernière version de master (case `rebuild` : reconstruire les images, par exemple pour les correctifs des images de base). Pour revenir à une version précise depuis le VPS (`~/territoire`) :
```bash
docker pull ghcr.io/cteillet/territoire-back:<commit>
docker tag ghcr.io/cteillet/territoire-back:<commit> ghcr.io/cteillet/territoire-back:latest
docker compose up -d territoire-back
```

Les secrets (`POSTGRES_PASSWORD`, `JWT_SECRET_KEY`, …) sont fournis par l'environnement du VPS.

Le workflow `Trivy` analyse les images du back, du front et de la sauvegarde à chaque modification et chaque lundi. Il échoue sur une faille critique corrigeable ; les failles hautes et critiques apparaissent dans l'onglet Security > Code scanning du dépôt.

### E-mails (récapitulatif des retards)
Le back envoie chaque lundi à 8 h (heure de Paris) la liste des territoires en retard. Sans serveur SMTP, rien n'est envoyé et Paramètres > Autres paramètres le signale.

**Mise en place avec Gmail (une fois)**
1. Sur le compte Google expéditeur, activer la validation en deux étapes puis créer un mot de passe d'application sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (nom : `territoire`). Le ranger dans le gestionnaire de mots de passe.
2. Ajouter dans l'environnement du VPS, à côté des autres secrets :
   ```bash
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=adresse@gmail.com
   MAIL_PASSWORD=abcdefghijklmnop   # mot de passe d'application, sans espaces
   MAIL_FROM=                        # facultatif, par défaut MAIL_USERNAME
   ```
3. Après le déploiement (`docker compose up -d territoire-back`), dans Paramètres > Autres paramètres : saisir les destinataires, « Enregistrer », puis « Envoyer maintenant » pour vérifier la réception.

Tout autre serveur SMTP en STARTTLS sur le port 587 convient (Brevo, OVH…). L'horaire est réglé par `territoire.late-report.cron` dans `application.properties` (format cron Spring, `0 0 8 * * MON`).

### Intégrations (tuile Homepage)
`GET /api/integrations/resume` renvoie le nombre de territoires par statut, sans aucune donnée personnelle :
```json
{"late": 7, "assigned": 42, "available": 18, "pending": 3, "total": 70}
```
Il s'authentifie par une clé dédiée dans l'en-tête `X-API-Key`, qui n'ouvre aucun autre endpoint. Sans clé configurée, il répond 401.

1. Générer une clé (32 caractères minimum) et l'ajouter dans l'environnement du VPS, à côté des autres secrets :
   ```bash
   INTEGRATIONS_API_KEY=$(openssl rand -hex 32)
   ```
2. Après le déploiement (`docker compose up -d territoire-back`), vérifier :
   ```bash
   curl -s -H "X-API-Key: $INTEGRATIONS_API_KEY" https://tms.cteillet.fr/api/integrations/resume
   ```
3. Côté [Homepage](https://gethomepage.dev), la clé va dans une variable `HOMEPAGE_VAR_TMS_KEY` et le widget `customapi` affiche les compteurs :
   ```yaml
   widget:
     type: customapi
     url: https://tms.cteillet.fr/api/integrations/resume
     headers:
       X-API-Key: "{{HOMEPAGE_VAR_TMS_KEY}}"
     mappings:
       - field: late
         label: En retard
       - field: assigned
         label: Attribués
       - field: available
         label: Disponibles
       - field: pending
         label: En attente
   ```

### Imprimante d'étiquettes (Brother P-touch)
Le navigateur pilote directement l'imprimante en Bluetooth (API Web Serial) : rien à installer, ni sur le VPS ni sur l'appareil. C'est l'appareil qui fait l'attribution qui imprime. Il faut Chrome ou Edge sur ordinateur, ou Chrome sur Android. Les iPhone et iPad n'ont pas Web Serial : TMS y prépare un fichier d'étiquette que l'application Brother imprime (voir plus bas).

**Mise en place (sur chaque appareil)**
1. Appairer la P-touch dans les réglages Bluetooth de l'appareil (sous Windows : Paramètres > Bluetooth et appareils > Ajouter un appareil).
2. Dans TMS, Paramètres > Autres paramètres > Imprimante d'étiquettes : « Choisir l'imprimante », puis la sélectionner dans la fenêtre du navigateur.
3. « Imprimer une étiquette de test ». La case « Imprimer l'étiquette à chaque attribution faite depuis cet appareil » est cochée d'office ; la décocher pour n'imprimer qu'à la demande (fiche du territoire).

L'étiquette s'adapte à la largeur du ruban en place (testée pour 12 mm). Le PT-P710BT coupe l'étiquette ; sur le PT-P300BT, on la coupe avec le levier. Si l'imprimante est éteinte ou hors de portée, l'attribution est quand même enregistrée et un message propose de réessayer.

**Sur iPhone et iPad (fichier LBX)**

Après chaque attribution (classique ou depuis une demande), TMS génère dans le navigateur un fichier `.lbx` (format de P-touch Editor) et affiche une carte « Étiquette prête », qui reste à l'écran jusqu'à ce qu'on la ferme. Le bouton « Télécharger » enregistre le fichier dans Fichiers > Téléchargements ; « Partager », s'il apparaît, ouvre directement les options de partage. On ouvre le fichier, on choisit Design&Print 2 dans les options de partage, puis on touche « Imprimer » dans l'application : c'est elle qui imprime, TMS ne fait que préparer le fichier. La fiche du territoire (bouton « Télécharger l'étiquette ») redonne le fichier de l'attribution en cours, avec son échéance actuelle. Ni le choix d'une imprimante ni l'impression automatique ne s'appliquent sur iPhone.

Le fichier est prévu pour un PT-P710BT et un ruban de 12 mm : deux objets texte (prénom et initiale en gras, échéance dessous), centrés, en Arial ; longueur adaptée au texte, nom écrit plus petit au-delà de 70 mm. Sa structure reprend un fichier enregistré par P-touch Editor (cf. `territoire-front/lib/lbx.ts`). Les tests automatisés vérifient l'archive, le XML et les textes, mais seule l'application Brother confirme la compatibilité : à revalider sur l'iPhone après toute modification de `lib/lbx.ts`.

Validation sur iPhone (Safari, puis TMS installé sur l'écran d'accueil) :
1. Installer P-touch Design&Print 2 depuis l'App Store, y appairer le PT-P710BT et vérifier qu'un ruban de 12 mm est en place.
2. Dans TMS, Paramètres > Autres paramètres > Imprimante d'étiquettes : « Télécharger une étiquette de test », puis ouvrir le fichier (Fichiers > Téléchargements) et choisir Design&Print 2. Vérifier l'aperçu : deux lignes centrées, accents corrects, rien de coupé ; puis « Imprimer ».
3. Attribuer un territoire : la carte « Étiquette prête » doit apparaître et rester après la fermeture du dialogue. Tester « Télécharger », puis « Partager » s'il est proposé (annuler le partage ne doit rien casser).
4. Même chose depuis une demande de territoire, puis depuis la fiche du territoire après avoir modifié l'échéance (la nouvelle date doit figurer sur l'étiquette).
5. Essayer un prénom long ou accentué (fiche d'une personne de test) pour vérifier la réduction du texte.

### Sauvegardes de la base
Le service `db-backup` (`config/backup`) fait chaque nuit à 02:00 UTC un `pg_dump`, le chiffre avec [age](https://age-encryption.org) et l'envoie avec [rclone](https://rclone.org) dans le dossier `territoire-backups` d'un Google Drive. Le VPS n'a que la clé publique : il ne peut pas relire ses propres sauvegardes, et Google ne voit que des fichiers chiffrés. Dans ce dossier :
- `daily/territoire_<date>.dump.age` : une par jour, gardées 30 jours (`BACKUP_RETENTION_DAYS`) ;
- `monthly/territoire_<mois>.dump.age` : la première de chaque mois, gardée 365 jours (`BACKUP_MONTHLY_RETENTION_DAYS`).

Les fichiers supprimés par la rotation passent encore 30 jours dans la corbeille du Drive. Tout autre stockage géré par rclone (S3, Backblaze B2, SFTP…) marche aussi : seuls `rclone config` et `BACKUP_REMOTE` changent.

Le test `Backup BDD` de la CI fait une sauvegarde puis une restauration complètes (procédure ci-dessous) à chaque modification de `config/backup` ou de `docker-compose.yml`.

**Mise en place (une fois)**
1. Sur ton poste Windows (pas sur le VPS), installer age et rclone puis générer la paire de clés :
   ```powershell
   winget install FiloSottile.age
   winget install Rclone.Rclone
   age-keygen -o territoire-backup.key
   ```
   Ranger `territoire-backup.key` dans le gestionnaire de mots de passe : sans cette clé privée, les sauvegardes sont illisibles. La ligne `# public key: age1…` donne la clé publique.
2. Ajouter dans l'environnement du VPS, à côté des autres secrets :
   ```bash
   BACKUP_REMOTE=gdrive:territoire-backups
   BACKUP_AGE_RECIPIENT=age1…   # clé publique
   BACKUP_HEALTHCHECK_URL=https://hc-ping.com/<uuid>   # facultatif, voir 6.
   ```
3. Créer un client OAuth Google : le client partagé de rclone cesse de fonctionner en 2026. Sur [console.cloud.google.com](https://console.cloud.google.com), avec le compte Google qui recevra les sauvegardes :
   - créer un projet (ex. `territoire-backup`), puis activer « Google Drive API » (API et services > Bibliothèque) ;
   - dans « Google Auth Platform » (API et services > Écran de consentement OAuth), configurer l'application (audience « Externe ») et ajouter le niveau d'accès `…/auth/drive.file` (Accès aux données) ;
   - dans Branding, renseigner une page d'accueil et une page de règles de confidentialité sur ton domaine (l'adresse de Territoire suffit) et ajouter ce domaine aux domaines autorisés. Google l'exige pour publier. Pas de logo : il imposerait une validation de l'application par Google ;
   - publier l'application (Audience > « Publier l'application », statut « En production »). En mode « Test », le jeton expire au bout de 7 jours et les sauvegardes s'arrêtent ;
   - dans « Clients », créer un client de type « Application de bureau » et ranger son ID et son code secret dans le gestionnaire de mots de passe.
4. Après le déploiement, connecter le Drive depuis le VPS (dans `~/territoire`) avec `docker compose run --rm db-backup rclone config`, puis répondre :
   - `n` (nouveau remote), nom `gdrive`, type de stockage `drive` ;
   - `client_id` et `client_secret` : ceux du client créé à l'étape 3 ;
   - `scope` : `drive.file`. rclone ne voit alors que les fichiers qu'il a créés, pas le reste du Drive ;
   - `service_account_file` : laisser vide, puis `n` à la configuration avancée ;
   - « Use web browser to automatically authenticate? » : `n`. rclone affiche une commande `rclone authorize "drive" "…"` : la lancer sur le poste Windows, se connecter au compte Google dans le navigateur, puis coller dans le terminal du VPS le jeton affiché ;
   - « Configure this as a Shared Drive? » : `n`, puis `y` pour garder le remote et `q` pour quitter.

   La configuration et le jeton Google sont enregistrés dans `~/territoire/rclone/`. Ne pas créer le dossier `territoire-backups` à la main : avec `drive.file`, rclone ne voit pas un dossier qu'il n'a pas créé lui-même.
5. Démarrer le service, lancer une première sauvegarde et vérifier qu'elle est arrivée (elle apparaît aussi sur drive.google.com). Tant que les étapes 2 à 4 ne sont pas faites, `db-backup` redémarre en boucle avec « Configuration incomplète ».
   ```bash
   docker compose up -d db-backup
   docker compose run --rm db-backup run
   docker compose run --rm db-backup list
   ```
6. Supervision : créer un check sur [healthchecks.io](https://healthchecks.io) (période 1 jour, délai de grâce 2 h) et mettre son URL dans `BACKUP_HEALTHCHECK_URL`. Il prévient par e-mail quand une sauvegarde échoue ou n'a pas eu lieu, par exemple si le jeton Google a été révoqué. Il faut alors reconnecter le Drive avec `docker compose run --rm db-backup rclone config reconnect gdrive:`.
7. Garder aussi une copie du fichier d'environnement du VPS dans le gestionnaire de mots de passe : sans `JWT_SECRET_KEY` / `ACCESS_LINK_SECRET`, les liens personnels `/m/…` seraient à régénérer.

**Restauration**

La procédure est la même sur le VPS actuel et sur un nouveau VPS. Sur un nouveau VPS, il faut d'abord remettre Docker, `docker-compose.yml`, `config/` et l'environnement, refaire l'étape 4 de la mise en place pour reconnecter le Drive (le client OAuth de l'étape 3 reste valable), puis lancer `docker compose up -d postgis`. La base en place est renommée, jamais supprimée.
```bash
cd ~/territoire
mkdir -p restauration
nano restauration/cle.txt   # coller la clé privée age (contenu de territoire-backup.key)

# 1. Choisir puis télécharger et déchiffrer une sauvegarde
docker compose run --rm db-backup list
docker compose run --rm -v "$PWD/restauration:/restauration" db-backup fetch daily/territoire_<date>.dump.age
#    Variante sans rclone : télécharger le fichier depuis drive.google.com, le copier dans
#    restauration/territoire.dump.age, puis le déchiffrer :
#    docker compose run --rm --no-deps -v "$PWD/restauration:/restauration" db-backup age --decrypt \
#      --identity /restauration/cle.txt --output /restauration/territoire.dump /restauration/territoire.dump.age

# 2. Mettre la base actuelle de côté et en créer une vide (avec les extensions PostGIS)
docker compose stop territoire-back postgres-exporter db-backup
docker compose exec postgis psql -U admin -d postgres -v ON_ERROR_STOP=1 \
  -c 'ALTER DATABASE territoire RENAME TO territoire_avant_restauration' \
  -c 'CREATE DATABASE territoire TEMPLATE template_postgis'

# 3. Restaurer (tout ou rien), redémarrer, puis retirer la clé privée du VPS
docker compose run --rm --no-deps -v "$PWD/restauration:/restauration" db-backup \
  pg_restore --no-owner --exit-on-error --single-transaction --schema=public --dbname=territoire /restauration/territoire.dump
docker compose up -d
rm -rf restauration
```
Si la restauration échoue, la base vide peut être supprimée et `territoire_avant_restauration` renommée en `territoire`. Une fois l'application vérifiée, `territoire_avant_restauration` peut être supprimée (`DROP DATABASE`).

### Montée de version de PostGIS
L'image `postgis/postgis` est figée dans `docker-compose.yml`. Une montée mineure (ex. `17-3.5` → `17-3.6`) recrée le conteneur au déploiement sur les données en place, mais deux étapes restent à faire à la main :
- les extensions PostGIS gardent leur ancienne version tant qu'elles ne sont pas mises à jour : `SELECT postgis_full_version();` affiche « need upgrade » ;
- si l'image change de version de Debian (`17-3.6` : bullseye → trixie), la glibc change aussi, et avec elle l'ordre de tri du texte. Les index sur du texte sont alors à reconstruire. PostgreSQL le signale à chaque connexion (« collation version mismatch » dans `docker compose logs postgis`).

Les données ne sont pas modifiées : seuls les index et les fonctions de PostGIS sont reconstruits. Depuis `~/territoire` :
```bash
# Avant de fusionner la montée de version : une sauvegarde à jour
docker compose run --rm db-backup run

# Après le déploiement : extensions PostGIS (bases territoire et template_postgis)
docker compose exec postgis update-postgis.sh

# Si la version de Debian a changé : index et version de collation de chaque base
for db in territoire postgres template1 template_postgis; do
  docker compose exec postgis psql -U admin -d "$db" -v ON_ERROR_STOP=1 \
    -c "REINDEX DATABASE \"$db\"" -c "ALTER DATABASE \"$db\" REFRESH COLLATION VERSION"
done
```
En local, la base de `docker-compose-mini.yml` se met à jour de la même façon (`docker compose -f docker-compose-mini.yml exec postgis …`).

## Évolutions envisagées
- Relances automatiques avant échéance et en cas de retard.
- Journal d'audit (auteur des actions).
- Archivage plutôt que suppression des territoires.

## Licence
MIT, voir [LICENSE](LICENSE).
