-- Archivage plutôt que suppression : un territoire ou une personne qui a un historique d'attributions n'est plus
-- supprimé (l'historique partirait avec lui) mais archivé. Il disparaît des listes, des cartes et des statistiques en
-- cours, et peut être restauré. Une personne archivée peut ensuite être anonymisée (nom remplacé, coordonnées
-- effacées) : son historique reste compté, sans la nommer.
-- Colonnes ajoutées vides : rien n'est archivé, aucune donnée n'est modifiée.

ALTER TABLE public.territory ADD COLUMN IF NOT EXISTS archived_at timestamp(6) with time zone;

ALTER TABLE public.person ADD COLUMN IF NOT EXISTS archived_at timestamp(6) with time zone;
ALTER TABLE public.person ADD COLUMN IF NOT EXISTS anonymized_at timestamp(6) with time zone;
