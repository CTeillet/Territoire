-- Journal des actions : qui a fait quoi, et quand (attributions, retours, modifications, archivages, comptes...).
-- Sans clé étrangère : une ligne reste lisible même si le territoire ou la personne disparaît ; leur nom est gardé au
-- moment de l'action (et remplacé si la personne est anonymisée). Nouvelle table : aucune donnée existante modifiée.

CREATE TABLE IF NOT EXISTS public.audit_event (
    id uuid NOT NULL,
    occurred_at timestamp(6) with time zone NOT NULL,
    actor character varying(255) NOT NULL,
    action character varying(64) NOT NULL,
    territory_id uuid,
    territory_name character varying(255),
    person_id uuid,
    person_name character varying(255),
    details text,
    CONSTRAINT audit_event_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_event_occurred_at ON public.audit_event (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_territory_id ON public.audit_event (territory_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_person_id ON public.audit_event (person_id, occurred_at DESC);
