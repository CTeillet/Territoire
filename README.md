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
| `config` | Configuration de l'observabilité (OpenTelemetry, Prometheus, Loki, Tempo, Grafana) |
| `docker-compose.yml` | Déploiement complet (base, API, front, WAHA, observabilité) |

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

Sauvegarde de la base :
```bash
docker exec postgis_container pg_dump -U admin -Fc territoire > territoire_$(date +%F).dump
```

## Évolutions envisagées
- Relances automatiques avant échéance et en cas de retard.
- Journal d'audit (auteur des actions).
- Archivage plutôt que suppression des territoires.

## Licence
MIT, voir [LICENSE](LICENSE).
