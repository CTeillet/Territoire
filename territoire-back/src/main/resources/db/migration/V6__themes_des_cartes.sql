-- Thèmes du Plan IGN montrés sur chaque carte de l'application (Paramètres > Cartes), en JSON :
-- {"TERRITORIES": ["PLACES", "HOUSES", ...], ...}. Colonne ajoutée vide : chaque carte garde ses thèmes par défaut,
-- aucune donnée n'est modifiée.

ALTER TABLE public.setting ADD COLUMN IF NOT EXISTS map_themes text;
