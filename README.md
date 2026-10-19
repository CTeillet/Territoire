# Gestion de Territoires (TMS)

## Description
L'application permet d'attribuer, suivre et organiser la distribution de territoires composés de pâtés de maisons, de barres d'immeubles ou de certains numéros de rue. Elle assure la traçabilité des statuts et des attributions, avec authentification et gestion des utilisateurs.

## Fonctionnalités principales
- Gestion des territoires avec quatre statuts : **disponible, attribué, en attente, en retard**.
- Attribution d'un territoire à une personne (échéance à 4 mois), retour, prolongation et annulation.
- Passage automatique en retard et remise à disposition des territoires en attente (tâches de nuit).
- Rappels WhatsApp (via WAHA) pour les territoires en retard.
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
La CI (`.github/workflows`) lance lint et tests, construit les images (tags `latest` et SHA du commit) sur GitHub Container Registry, puis déploie sur le VPS via `docker compose`. Les secrets (`POSTGRES_PASSWORD`, `JWT_SECRET_KEY`, …) sont fournis par l'environnement du VPS.

Le workflow `Trivy` analyse les images du back, du front et de la sauvegarde à chaque modification et chaque lundi. Il échoue sur une faille critique corrigeable ; les failles hautes et critiques apparaissent dans l'onglet Security > Code scanning du dépôt.

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
   BACKUP_HEALTHCHECK_URL=https://hc-ping.com/<uuid>   # facultatif, voir 5.
   ```
3. Après le déploiement, connecter le Drive depuis le VPS (dans `~/territoire`) avec `docker compose run --rm db-backup rclone config`, puis répondre :
   - `n` (nouveau remote), nom `gdrive`, type de stockage `drive` ;
   - `client_id` et `client_secret` : laisser vide ;
   - `scope` : `drive.file`. rclone ne voit alors que les fichiers qu'il a créés, pas le reste du Drive ;
   - `service_account_file` : laisser vide, puis `n` à la configuration avancée ;
   - « Use web browser to automatically authenticate? » : `n`. rclone affiche une commande `rclone authorize "drive" "…"` : la lancer sur le poste Windows, se connecter au compte Google dans le navigateur, puis coller dans le terminal du VPS le jeton affiché ;
   - « Configure this as a Shared Drive? » : `n`, puis `y` pour garder le remote et `q` pour quitter.

   La configuration et le jeton Google sont enregistrés dans `~/territoire/rclone/`. Ne pas créer le dossier `territoire-backups` à la main : avec `drive.file`, rclone ne voit pas un dossier qu'il n'a pas créé lui-même. Si tu crées ton propre client OAuth Google au lieu de celui de rclone, passe-le en « Production » : en mode « Test », le jeton expire au bout de 7 jours.
4. Démarrer le service, lancer une première sauvegarde et vérifier qu'elle est arrivée (elle apparaît aussi sur drive.google.com). Tant que les étapes 2 et 3 ne sont pas faites, `db-backup` redémarre en boucle avec « Configuration incomplète ».
   ```bash
   docker compose up -d db-backup
   docker compose run --rm db-backup run
   docker compose run --rm db-backup list
   ```
5. Supervision : créer un check sur [healthchecks.io](https://healthchecks.io) (période 1 jour, délai de grâce 2 h) et mettre son URL dans `BACKUP_HEALTHCHECK_URL`. Il prévient par e-mail quand une sauvegarde échoue ou n'a pas eu lieu, par exemple si le jeton Google a été révoqué. Il faut alors reconnecter le Drive avec `docker compose run --rm db-backup rclone config reconnect gdrive:`.
6. Garder aussi une copie du fichier d'environnement du VPS dans le gestionnaire de mots de passe : sans `JWT_SECRET_KEY` / `ACCESS_LINK_SECRET`, les liens personnels `/m/…` seraient à régénérer.

**Restauration**

La procédure est la même sur le VPS actuel et sur un nouveau VPS. Sur un nouveau VPS, il faut d'abord remettre Docker, `docker-compose.yml`, `config/` et l'environnement, refaire l'étape 3 de la mise en place pour reconnecter le Drive, puis lancer `docker compose up -d postgis`. La base en place est renommée, jamais supprimée.
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
