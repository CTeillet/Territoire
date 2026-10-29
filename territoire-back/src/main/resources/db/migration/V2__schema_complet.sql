-- Schéma complet de l'application, tel qu'il existe en production au 2026-10-29 (créé jusque-là par Hibernate,
-- ddl-auto=update) : mêmes colonnes, mêmes types, mêmes noms de contraintes.
--
-- Sur la base de production, toutes les tables existent déjà : CREATE TABLE IF NOT EXISTS ne fait rien, aucune donnée
-- n'est touchée. Sur une base neuve, le script crée tout le schéma.
-- Vérifié par FlywaySchemaIntegrationTest : schéma inchangé sur une copie du schéma de production, et schéma identique
-- à la production sur une base vide.
--
-- Les changements suivants passent par de nouvelles migrations (V3__..., V4__...) : Hibernate ne fait plus que valider
-- le schéma (spring.jpa.hibernate.ddl-auto=validate).

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.city (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    center public.geometry(Point,4326),
    zip_code character varying(255),
    color_hex character varying(255),
    CONSTRAINT city_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.person (
    id uuid NOT NULL,
    email character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    phone_number character varying(255),
    CONSTRAINT person_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.campaign (
    id uuid NOT NULL,
    closed boolean NOT NULL,
    description character varying(255),
    end_date date,
    name character varying(255),
    start_date date,
    CONSTRAINT campaign_pkey PRIMARY KEY (id)
);

-- « user » est un mot réservé de PostgreSQL : nom entre guillemets
CREATE TABLE IF NOT EXISTS public."user" (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    token_version integer,
    CONSTRAINT user_pkey PRIMARY KEY (id),
    CONSTRAINT ukob8kqyqqgmefl0aco34akdtpe UNIQUE (email),
    CONSTRAINT user_role_check CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'UTILISATEUR'::character varying, 'GESTIONNAIRE'::character varying, 'SUPERVISEUR'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS public.setting (
    id uuid NOT NULL,
    publishers_count integer,
    late_reminder_message text,
    access_link_message text,
    assignment_message text,
    assignment_notification_enabled boolean,
    territory_request_phone character varying(255),
    late_report_recipients text,
    assignment_duration_months integer,
    pending_duration_months integer,
    CONSTRAINT setting_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.territory_status_history (
    id uuid NOT NULL,
    assigned_territory integer NOT NULL,
    available_territory integer NOT NULL,
    date date NOT NULL,
    late_territory integer NOT NULL,
    pending_territory integer NOT NULL,
    CONSTRAINT territory_status_history_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.refresh_token (
    id uuid NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    token_hash character varying(64) NOT NULL,
    used_at timestamp(6) with time zone,
    user_id uuid NOT NULL,
    CONSTRAINT refresh_token_pkey PRIMARY KEY (id),
    CONSTRAINT ukkdj16cltjxdksuyiosdhliveg UNIQUE (token_hash)
);

CREATE TABLE IF NOT EXISTS public.territory (
    id uuid NOT NULL,
    concave_hull public.geometry(MultiPolygon,4326),
    last_modified_date date,
    name character varying(255),
    note character varying(255),
    status character varying(255),
    city_id uuid NOT NULL,
    type character varying(255),
    territory_map bytea,
    territory_map_content_type character varying(255),
    territory_map_name character varying(255),
    version bigint DEFAULT 0 NOT NULL,
    CONSTRAINT territory_pkey PRIMARY KEY (id),
    CONSTRAINT fk3e4axs5d3p9al1posmdxjmkl0 FOREIGN KEY (city_id) REFERENCES public.city(id),
    CONSTRAINT territory_status_check CHECK (((status)::text = ANY ((ARRAY['AVAILABLE'::character varying, 'ASSIGNED'::character varying, 'PENDING'::character varying, 'LATE'::character varying])::text[]))),
    CONSTRAINT territory_type_check CHECK (((type)::text = ANY ((ARRAY['BUILDING'::character varying, 'HOUSE'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS public.block (
    id uuid NOT NULL,
    block public.geometry(Polygon,4326),
    territory_id uuid,
    CONSTRAINT block_pkey PRIMARY KEY (id),
    CONSTRAINT fk2ww62birsx9lkv5ieq6yc13pl FOREIGN KEY (territory_id) REFERENCES public.territory(id)
);

CREATE TABLE IF NOT EXISTS public.address_not_to_do (
    id uuid NOT NULL,
    city character varying(255),
    date date,
    number character varying(255),
    street character varying(255),
    zip_code character varying(255),
    territory_id uuid,
    CONSTRAINT address_not_to_do_pkey PRIMARY KEY (id),
    CONSTRAINT fk5754giu42oda8c3gssnc7mdel FOREIGN KEY (territory_id) REFERENCES public.territory(id)
);

CREATE TABLE IF NOT EXISTS public.assignment (
    id uuid NOT NULL,
    assignment_date date,
    due_date date,
    return_date date,
    person_id uuid,
    territory_id uuid,
    campaign_id uuid,
    returned_via character varying(255),
    CONSTRAINT assignment_pkey PRIMARY KEY (id),
    CONSTRAINT fkj1hbxxip5qh7oaj92htocjs00 FOREIGN KEY (person_id) REFERENCES public.person(id),
    CONSTRAINT fktwdduu3re86qd1nhlrfj16r1 FOREIGN KEY (territory_id) REFERENCES public.territory(id),
    CONSTRAINT fkaorrph369aewb1t8d7ac1278i FOREIGN KEY (campaign_id) REFERENCES public.campaign(id),
    CONSTRAINT assignment_returned_via_check CHECK (((returned_via)::text = ANY ((ARRAY['RESPONSABLE'::character varying, 'LIEN'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS public.campaign_territory (
    campaign_id uuid NOT NULL,
    territory_id uuid NOT NULL,
    CONSTRAINT fkiu6srpw6a19ncckgm09slmg4p FOREIGN KEY (campaign_id) REFERENCES public.campaign(id),
    CONSTRAINT fk30nucwxif40h82gycti3qqhs2 FOREIGN KEY (territory_id) REFERENCES public.territory(id)
);

CREATE TABLE IF NOT EXISTS public.campaign_remaining_territory (
    campaign_id uuid NOT NULL,
    territory_id uuid NOT NULL,
    CONSTRAINT fk69bfrv0sg3r9kbpyhm211u88u FOREIGN KEY (campaign_id) REFERENCES public.campaign(id),
    CONSTRAINT fkr6fgdv08iwp41bngqunq0s3bh FOREIGN KEY (territory_id) REFERENCES public.territory(id)
);

CREATE TABLE IF NOT EXISTS public.person_access (
    id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    expires_at date,
    last_sent_at timestamp(6) with time zone,
    last_used_at timestamp(6) with time zone,
    revoked boolean NOT NULL,
    version integer NOT NULL,
    person_id uuid NOT NULL,
    CONSTRAINT person_access_pkey PRIMARY KEY (id),
    CONSTRAINT ukn33rjxx607mdgn41ri46rt958 UNIQUE (person_id),
    CONSTRAINT fkhxahymrump603bqt2hs42nhqn FOREIGN KEY (person_id) REFERENCES public.person(id)
);

CREATE TABLE IF NOT EXISTS public.territory_reminder (
    id uuid NOT NULL,
    notes character varying(255),
    reminder_date date,
    person_id uuid NOT NULL,
    message_send text,
    CONSTRAINT territory_reminder_pkey PRIMARY KEY (id),
    CONSTRAINT fkcaglvpnqp831dt5i57ivmxmd4 FOREIGN KEY (person_id) REFERENCES public.person(id)
);

CREATE TABLE IF NOT EXISTS public.territory_reminder_territories (
    reminder_id uuid NOT NULL,
    territory_id uuid NOT NULL,
    CONSTRAINT fksrvm58txxa02rie487a5yr4s6 FOREIGN KEY (reminder_id) REFERENCES public.territory_reminder(id),
    CONSTRAINT fk9dldjsr17lisd7e5170nk40ck FOREIGN KEY (territory_id) REFERENCES public.territory(id)
);

CREATE TABLE IF NOT EXISTS public.territory_request (
    id uuid NOT NULL,
    closed_at timestamp(6) with time zone,
    comment text,
    created_at timestamp(6) with time zone NOT NULL,
    status character varying(255) NOT NULL,
    city_id uuid,
    person_id uuid NOT NULL,
    territory_id uuid,
    CONSTRAINT territory_request_pkey PRIMARY KEY (id),
    CONSTRAINT fkbo4nmq3fjwls7y0qfdmjspb0s FOREIGN KEY (city_id) REFERENCES public.city(id) ON DELETE SET NULL,
    CONSTRAINT fklql39ia481ta35h1pujp9os2s FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE,
    CONSTRAINT fk2kfvqpb6hjwt9gx8c71kugy62 FOREIGN KEY (territory_id) REFERENCES public.territory(id) ON DELETE SET NULL,
    CONSTRAINT territory_request_status_check CHECK (((status)::text = ANY ((ARRAY['EN_ATTENTE'::character varying, 'ATTRIBUEE'::character varying, 'CLOTUREE'::character varying, 'ANNULEE'::character varying])::text[])))
);
