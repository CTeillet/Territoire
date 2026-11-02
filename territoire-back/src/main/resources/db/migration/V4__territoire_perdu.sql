-- Territoire perdu : sa carte papier a disparu (peu importe qui l'a perdue). La page « Impression des cartes » propose
-- de réimprimer les territoires perdus.
-- Colonne ajoutée à false pour tous les territoires existants : aucune donnée n'est modifiée.

ALTER TABLE public.territory ADD COLUMN IF NOT EXISTS lost boolean NOT NULL DEFAULT false;
