-- Une seule attribution en cours (return_date IS NULL) par territoire, garantie par la base : jusqu'ici seul le verrou
-- optimiste sur territory (colonne version) l'empêchait. Les attributions de campagne sont créées avec une date de
-- retour : elles ne sont pas concernées.
--
-- La création de l'index échoue si un territoire a déjà plusieurs attributions en cours : la migration est annulée et
-- l'application ne démarre pas. Pour les repérer avant le déploiement :
--
--   SELECT territory_id, count(*) AS en_cours, array_agg(id ORDER BY assignment_date) AS attributions
--   FROM public.assignment
--   WHERE return_date IS NULL
--   GROUP BY territory_id
--   HAVING count(*) > 1;
--
-- Corriger en donnant une date de retour aux attributions en trop (en général les plus anciennes), puis redéployer.
--
-- Index seulement : aucune donnée n'est modifiée.

CREATE UNIQUE INDEX IF NOT EXISTS uk_assignment_running_territory ON public.assignment (territory_id) WHERE return_date IS NULL;

-- Clés étrangères les plus lues (historique d'un territoire, attributions d'une personne, pâtés de maisons et adresses à
-- ne pas faire d'un territoire) : PostgreSQL ne crée pas d'index pour une clé étrangère.
CREATE INDEX IF NOT EXISTS idx_assignment_territory_id ON public.assignment (territory_id);
CREATE INDEX IF NOT EXISTS idx_assignment_person_id ON public.assignment (person_id);
CREATE INDEX IF NOT EXISTS idx_block_territory_id ON public.block (territory_id);
CREATE INDEX IF NOT EXISTS idx_address_not_to_do_territory_id ON public.address_not_to_do (territory_id);
