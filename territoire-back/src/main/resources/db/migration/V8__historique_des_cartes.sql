-- Historique des cartes d'un territoire : chaque carte remplacée (carte physique générée, nouvelle carte importée,
-- carte précédente remise) est gardée ici au lieu d'être perdue. Nouvelle table : aucune donnée existante n'est
-- modifiée.

CREATE TABLE IF NOT EXISTS public.territory_map_version (
    id uuid NOT NULL,
    territory_id uuid NOT NULL,
    content bytea NOT NULL,
    file_name character varying(255),
    content_type character varying(255),
    replaced_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT territory_map_version_pkey PRIMARY KEY (id),
    CONSTRAINT fk_territory_map_version_territory FOREIGN KEY (territory_id) REFERENCES public.territory(id)
);

CREATE INDEX IF NOT EXISTS idx_territory_map_version_territory_id
    ON public.territory_map_version (territory_id, replaced_at DESC);
