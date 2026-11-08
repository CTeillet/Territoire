-- Suivi des envois WhatsApp (WAHA) : l'application signale une session déconnectée au lieu d'échouer en silence.
-- Colonnes ajoutées vides : aucune donnée n'est modifiée.

-- Dernier envoi réussi et dernier échec, tous messages confondus (réglages de l'application)
ALTER TABLE public.setting ADD COLUMN IF NOT EXISTS whatsapp_last_success_at timestamp(6) with time zone;
ALTER TABLE public.setting ADD COLUMN IF NOT EXISTS whatsapp_last_failure_at timestamp(6) with time zone;
ALTER TABLE public.setting ADD COLUMN IF NOT EXISTS whatsapp_last_failure text;

-- Échec du dernier message d'attribution envoyé à une personne (lien personnel)
ALTER TABLE public.person_access ADD COLUMN IF NOT EXISTS last_send_failed_at timestamp(6) with time zone;
ALTER TABLE public.person_access ADD COLUMN IF NOT EXISTS last_send_error text;
