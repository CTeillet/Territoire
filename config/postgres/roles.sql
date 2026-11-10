-- Rôles PostgreSQL dédiés (README > Rôles PostgreSQL). À lancer par le propriétaire des tables (admin), dans la base
-- de l'application : les migrations Flyway continuent de passer par lui.
--
--   docker compose exec -T postgis psql -U admin -d territoire -v ON_ERROR_STOP=1 \
--     -v mot_de_passe_app="$MOT_DE_PASSE_APP" -v mot_de_passe_exporter="$MOT_DE_PASSE_EXPORTER" < config/postgres/roles.sql
--
-- Relançable : un rôle existant garde ses droits et prend le mot de passe donné.
-- Aucune donnée ni aucune table n'est modifiée : seulement des rôles et des droits.

-- Application (territoire-back) : lit et écrit les données. Elle ne peut ni créer, modifier ou supprimer une table,
-- ni lire les fichiers du serveur ou y lancer des commandes (ce que permet le superutilisateur admin).
SELECT 'CREATE ROLE territoire_app'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'territoire_app') \gexec
ALTER ROLE territoire_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'mot_de_passe_app';
GRANT USAGE ON SCHEMA public TO territoire_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO territoire_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO territoire_app;
-- Tables et séquences que créeront les prochaines migrations (lancées par le rôle qui exécute ce script)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO territoire_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO territoire_app;

-- postgres-exporter : statistiques du serveur seulement (rôle prédéfini pg_monitor), aucune donnée de l'application
SELECT 'CREATE ROLE postgres_exporter'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres_exporter') \gexec
ALTER ROLE postgres_exporter WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'mot_de_passe_exporter';
GRANT pg_monitor TO postgres_exporter;

SELECT format('GRANT CONNECT ON DATABASE %I TO territoire_app, postgres_exporter', current_database()) \gexec
