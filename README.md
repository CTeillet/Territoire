# Gestion de Territoires

## Description
L'application de gestion de territoires permet d'attribuer, suivre et organiser la distribution de territoires composés de pâtés de maison, de barres d'immeubles ou de certains numéros de rue. Elle assure la traçabilité des statuts et des attributions tout en intégrant un système d'authentification et de gestion des utilisateurs.

## Fonctionnalités principales
- Gestion des territoires avec trois statuts : **disponible, attribué, en attente**.
- Assignation d'un territoire à une personne pour une durée maximale de 4 mois.
- Notification en cas de non-retour d'un territoire dans les délais.
- Historisation des statuts et des attributions.
- Gestion des utilisateurs avec différents rôles et droits d'accès :
  - **Admin** : Accès total.
  - **Utilisateur standard** : Consultation uniquement.
  - **Gestionnaire** : Attribution et restitution de territoires.
  - **Superviseur** : Modification des territoires et personnes et attribution et restitution de territoire.
- Authentification sécurisée avec Redux Store et Spring Boot.
- Interface web en **Next.js avec TypeScript et Tailwind CSS**.

## Architecture
### Backend
- **Framework** : Spring Boot 3.3.0 (Java 21)
- **Base de données** : PostgreSQL (auto-hébergé sur VPS avec Docker)
- **Authentification** : JWT + Spring Security
- **Communication** : REST API

### Frontend
- **Framework** : Next.js avec TypeScript
- **UI** : Tailwind CSS
- **State Management** : Redux Store
- **Authentification** : Intégrée via Redux et JWT

## Installation et déploiement
### Prérequis
- Docker & Docker Compose
- Java 21 + Maven
- Node.js + npm/yarn

### Installation Backend
```bash
git clone https://github.com/ton-repo/gestion-territoires.git
cd gestion-territoires/backend
cp .env.example .env
mvn clean install
```
Lancer le backend avec Docker :
```bash
docker-compose up -d
```

### Installation Frontend
```bash
cd ../frontend
cp .env.example .env
yarn install
yarn dev
```

## API REST
L'API REST est documentée via Swagger, accessible sur :
```
http://localhost:8080/swagger-ui.html
```

## Licence
Ce projet est sous licence MIT.

