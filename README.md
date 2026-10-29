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
- Export / import Excel, impression de cartes, adresses à ne pas visiter.
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
| `docker-compose.yml` | Déploiement complet (base, sauvegarde, API, front, WAHA, observabilité) |

### Base de données
Le schéma est géré par Hibernate (`ddl-auto=update`). Flyway est présent pour les changements que Hibernate ne sait pas faire seul (renommage, suppression de colonne, transformation de données) : ajouter un fichier `V2__description.sql` dans `territoire-back/src/main/resources/db/migration`.

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
Variables attendues : `JWT_SECRET_KEY` (clé base64), `WAHA_API_KEY_PLAIN_TEXT`, et en option `ACCESS_LINK_SECRET` (clé des liens personnels, sinon dérivée de `JWT_SECRET_KEY`).

Frontend (port 40000) :
```bash
cd territoire-front
npm ci
npm run dev
```

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

## Évolutions envisagées
- Relances automatiques avant échéance et en cas de retard.
- Journal d'audit (auteur des actions).
- Archivage plutôt que suppression des territoires.

## Licence
MIT, voir [LICENSE](LICENSE).
