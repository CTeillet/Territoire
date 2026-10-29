-- Schéma de la base de production au 2026-10-29 (pg_dump --schema-only --no-owner, PostgreSQL 17.5, PostGIS 3.5),
-- avant la migration V2. Structure seulement, aucune donnée.
-- Sans les extensions et les schémas tiger/topology, déjà créés par l'image postgis/postgis.
-- Utilisé par FlywaySchemaIntegrationTest et FlywayValidateIntegrationTest (script d'initialisation du conteneur).

CREATE TABLE public.address_not_to_do (
    id uuid NOT NULL,
    city character varying(255),
    date date,
    number character varying(255),
    street character varying(255),
    zip_code character varying(255),
    territory_id uuid
);

CREATE TABLE public.assignment (
    id uuid NOT NULL,
    assignment_date date,
    due_date date,
    return_date date,
    person_id uuid,
    territory_id uuid,
    campaign_id uuid,
    returned_via character varying(255),
    CONSTRAINT assignment_returned_via_check CHECK (((returned_via)::text = ANY ((ARRAY['RESPONSABLE'::character varying, 'LIEN'::character varying])::text[])))
);

CREATE TABLE public.block (
    id uuid NOT NULL,
    block public.geometry(Polygon,4326),
    territory_id uuid
);

CREATE TABLE public.campaign (
    id uuid NOT NULL,
    closed boolean NOT NULL,
    description character varying(255),
    end_date date,
    name character varying(255),
    start_date date
);

CREATE TABLE public.campaign_remaining_territory (
    campaign_id uuid NOT NULL,
    territory_id uuid NOT NULL
);

CREATE TABLE public.campaign_territory (
    campaign_id uuid NOT NULL,
    territory_id uuid NOT NULL
);

CREATE TABLE public.city (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    center public.geometry(Point,4326),
    zip_code character varying(255),
    color_hex character varying(255)
);

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);

CREATE TABLE public.person (
    id uuid NOT NULL,
    email character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    phone_number character varying(255)
);

CREATE TABLE public.person_access (
    id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    expires_at date,
    last_sent_at timestamp(6) with time zone,
    last_used_at timestamp(6) with time zone,
    revoked boolean NOT NULL,
    version integer NOT NULL,
    person_id uuid NOT NULL
);

CREATE TABLE public.refresh_token (
    id uuid NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    token_hash character varying(64) NOT NULL,
    used_at timestamp(6) with time zone,
    user_id uuid NOT NULL
);

CREATE TABLE public.setting (
    id uuid NOT NULL,
    publishers_count integer,
    late_reminder_message text,
    access_link_message text,
    assignment_message text,
    assignment_notification_enabled boolean,
    territory_request_phone character varying(255),
    late_report_recipients text,
    assignment_duration_months integer,
    pending_duration_months integer
);

CREATE TABLE public.territory (
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
    CONSTRAINT territory_status_check CHECK (((status)::text = ANY ((ARRAY['AVAILABLE'::character varying, 'ASSIGNED'::character varying, 'PENDING'::character varying, 'LATE'::character varying])::text[]))),
    CONSTRAINT territory_type_check CHECK (((type)::text = ANY ((ARRAY['BUILDING'::character varying, 'HOUSE'::character varying])::text[])))
);

CREATE TABLE public.territory_reminder (
    id uuid NOT NULL,
    notes character varying(255),
    reminder_date date,
    person_id uuid NOT NULL,
    message_send text
);

CREATE TABLE public.territory_reminder_territories (
    reminder_id uuid NOT NULL,
    territory_id uuid NOT NULL
);

CREATE TABLE public.territory_request (
    id uuid NOT NULL,
    closed_at timestamp(6) with time zone,
    comment text,
    created_at timestamp(6) with time zone NOT NULL,
    status character varying(255) NOT NULL,
    city_id uuid,
    person_id uuid NOT NULL,
    territory_id uuid,
    CONSTRAINT territory_request_status_check CHECK (((status)::text = ANY ((ARRAY['EN_ATTENTE'::character varying, 'ATTRIBUEE'::character varying, 'CLOTUREE'::character varying, 'ANNULEE'::character varying])::text[])))
);

CREATE TABLE public.territory_status_history (
    id uuid NOT NULL,
    assigned_territory integer NOT NULL,
    available_territory integer NOT NULL,
    date date NOT NULL,
    late_territory integer NOT NULL,
    pending_territory integer NOT NULL
);

CREATE TABLE public."user" (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    token_version integer,
    CONSTRAINT user_role_check CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'UTILISATEUR'::character varying, 'GESTIONNAIRE'::character varying, 'SUPERVISEUR'::character varying])::text[])))
);

ALTER TABLE ONLY public.address_not_to_do ADD CONSTRAINT address_not_to_do_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.assignment ADD CONSTRAINT assignment_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.block ADD CONSTRAINT block_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.campaign ADD CONSTRAINT campaign_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.city ADD CONSTRAINT city_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.flyway_schema_history ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);
ALTER TABLE ONLY public.person_access ADD CONSTRAINT person_access_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.person ADD CONSTRAINT person_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.refresh_token ADD CONSTRAINT refresh_token_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.setting ADD CONSTRAINT setting_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.territory ADD CONSTRAINT territory_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.territory_reminder ADD CONSTRAINT territory_reminder_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.territory_request ADD CONSTRAINT territory_request_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.territory_status_history ADD CONSTRAINT territory_status_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.refresh_token ADD CONSTRAINT ukkdj16cltjxdksuyiosdhliveg UNIQUE (token_hash);
ALTER TABLE ONLY public.person_access ADD CONSTRAINT ukn33rjxx607mdgn41ri46rt958 UNIQUE (person_id);
ALTER TABLE ONLY public."user" ADD CONSTRAINT ukob8kqyqqgmefl0aco34akdtpe UNIQUE (email);
ALTER TABLE ONLY public."user" ADD CONSTRAINT user_pkey PRIMARY KEY (id);

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);

ALTER TABLE ONLY public.territory_request ADD CONSTRAINT fk2kfvqpb6hjwt9gx8c71kugy62 FOREIGN KEY (territory_id) REFERENCES public.territory(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.block ADD CONSTRAINT fk2ww62birsx9lkv5ieq6yc13pl FOREIGN KEY (territory_id) REFERENCES public.territory(id);
ALTER TABLE ONLY public.campaign_territory ADD CONSTRAINT fk30nucwxif40h82gycti3qqhs2 FOREIGN KEY (territory_id) REFERENCES public.territory(id);
ALTER TABLE ONLY public.territory ADD CONSTRAINT fk3e4axs5d3p9al1posmdxjmkl0 FOREIGN KEY (city_id) REFERENCES public.city(id);
ALTER TABLE ONLY public.address_not_to_do ADD CONSTRAINT fk5754giu42oda8c3gssnc7mdel FOREIGN KEY (territory_id) REFERENCES public.territory(id);
ALTER TABLE ONLY public.campaign_remaining_territory ADD CONSTRAINT fk69bfrv0sg3r9kbpyhm211u88u FOREIGN KEY (campaign_id) REFERENCES public.campaign(id);
ALTER TABLE ONLY public.territory_reminder_territories ADD CONSTRAINT fk9dldjsr17lisd7e5170nk40ck FOREIGN KEY (territory_id) REFERENCES public.territory(id);
ALTER TABLE ONLY public.assignment ADD CONSTRAINT fkaorrph369aewb1t8d7ac1278i FOREIGN KEY (campaign_id) REFERENCES public.campaign(id);
ALTER TABLE ONLY public.territory_request ADD CONSTRAINT fkbo4nmq3fjwls7y0qfdmjspb0s FOREIGN KEY (city_id) REFERENCES public.city(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.territory_reminder ADD CONSTRAINT fkcaglvpnqp831dt5i57ivmxmd4 FOREIGN KEY (person_id) REFERENCES public.person(id);
ALTER TABLE ONLY public.person_access ADD CONSTRAINT fkhxahymrump603bqt2hs42nhqn FOREIGN KEY (person_id) REFERENCES public.person(id);
ALTER TABLE ONLY public.campaign_territory ADD CONSTRAINT fkiu6srpw6a19ncckgm09slmg4p FOREIGN KEY (campaign_id) REFERENCES public.campaign(id);
ALTER TABLE ONLY public.assignment ADD CONSTRAINT fkj1hbxxip5qh7oaj92htocjs00 FOREIGN KEY (person_id) REFERENCES public.person(id);
ALTER TABLE ONLY public.territory_request ADD CONSTRAINT fklql39ia481ta35h1pujp9os2s FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.campaign_remaining_territory ADD CONSTRAINT fkr6fgdv08iwp41bngqunq0s3bh FOREIGN KEY (territory_id) REFERENCES public.territory(id);
ALTER TABLE ONLY public.territory_reminder_territories ADD CONSTRAINT fksrvm58txxa02rie487a5yr4s6 FOREIGN KEY (reminder_id) REFERENCES public.territory_reminder(id);
ALTER TABLE ONLY public.assignment ADD CONSTRAINT fktwdduu3re86qd1nhlrfj16r1 FOREIGN KEY (territory_id) REFERENCES public.territory(id);

-- Ligne créée par spring.flyway.baseline-on-migrate=true au premier démarrage avec Flyway (base existante, version 1)
INSERT INTO public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)
VALUES (1, '1', '<< Flyway Baseline >>', 'BASELINE', '<< Flyway Baseline >>', NULL, 'admin', 0, true);
