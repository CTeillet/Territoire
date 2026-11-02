-- Prolongation d'une attribution : l'attribution en cours se termine (returned_via = 'PROLONGATION') et une nouvelle
-- commence le même jour pour la même personne.
-- Seule la liste des valeurs autorisées s'élargit : aucune donnée n'est modifiée.

ALTER TABLE public.assignment DROP CONSTRAINT IF EXISTS assignment_returned_via_check;
ALTER TABLE public.assignment ADD CONSTRAINT assignment_returned_via_check
    CHECK (((returned_via)::text = ANY ((ARRAY['RESPONSABLE'::character varying, 'LIEN'::character varying, 'PROLONGATION'::character varying])::text[])));
