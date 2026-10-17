#!/usr/bin/env bash
# Sauvegarde de la base vers un stockage externe : pg_dump (format custom), chiffré avec age, envoyé avec rclone.
#
#   db-backup schedule        une sauvegarde par jour à BACKUP_TIME (UTC) ; commande par défaut du conteneur
#   db-backup run             une sauvegarde immédiate
#   db-backup list            liste les sauvegardes présentes sur le stockage
#   db-backup fetch <fichier> télécharge et déchiffre une sauvegarde dans /restauration (clé privée : /restauration/cle.txt)
#   db-backup <cmd> ...       exécute la commande telle quelle (rclone config, pg_restore...)
#
# Base : variables libpq (PGHOST, PGUSER, PGPASSWORD, PGDATABASE).
# Stockage : BACKUP_REMOTE, chemin rclone (ex. gdrive:territoire-backups) dont le remote est défini dans RCLONE_CONFIG.
# Chiffrement : BACKUP_AGE_RECIPIENT, clé publique age (age1...) ; la clé privée reste hors du serveur, sauf pour restaurer.
# Supervision (facultative) : BACKUP_HEALTHCHECK_URL, appelée après chaque sauvegarde planifiée (suffixe /fail en cas d'échec).
set -euo pipefail

BACKUP_TIME="${BACKUP_TIME:-02:00}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_MONTHLY_RETENTION_DAYS="${BACKUP_MONTHLY_RETENTION_DAYS:-365}"

log() {
	echo "$(date -u '+%F %T') $*"
}

require() {
	local missing=() var
	for var in "$@"; do
		[ -n "${!var:-}" ] || missing+=("$var")
	done
	if [ ${#missing[@]} -gt 0 ]; then
		log "Configuration incomplète, variables manquantes : ${missing[*]}" >&2
		exit 1
	fi
}

require_all() {
	require BACKUP_REMOTE BACKUP_AGE_RECIPIENT PGHOST PGUSER PGPASSWORD PGDATABASE
}

backup() {
	require_all
	local stamp month
	stamp=$(date -u +%Y-%m-%dT%H%MZ)
	month=$(date -u +%Y-%m)
	tmp=$(mktemp -d)
	trap 'rm -rf "$tmp"' EXIT

	log "Dump de la base $PGDATABASE"
	pg_dump --format=custom --file="$tmp/territoire.dump"
	# Archive relue avant l'envoi : un dump tronqué ou illisible échoue ici
	pg_restore --list "$tmp/territoire.dump" > /dev/null
	age --recipient "$BACKUP_AGE_RECIPIENT" --output "$tmp/territoire.dump.age" "$tmp/territoire.dump"

	log "Envoi vers $BACKUP_REMOTE ($(du -h "$tmp/territoire.dump.age" | cut -f1))"
	rclone copyto "$tmp/territoire.dump.age" "$BACKUP_REMOTE/daily/territoire_$stamp.dump.age"
	# La première sauvegarde réussie de chaque mois est aussi conservée comme mensuelle
	rclone copyto --ignore-existing "$tmp/territoire.dump.age" "$BACKUP_REMOTE/monthly/territoire_$month.dump.age"

	# Rotation, seulement une fois la nouvelle sauvegarde envoyée (0 = aucune suppression)
	if [ "$BACKUP_RETENTION_DAYS" -gt 0 ]; then
		rclone delete --min-age "${BACKUP_RETENTION_DAYS}d" --include "territoire_*.dump.age" "$BACKUP_REMOTE/daily"
	fi
	if [ "$BACKUP_MONTHLY_RETENTION_DAYS" -gt 0 ]; then
		rclone delete --min-age "${BACKUP_MONTHLY_RETENTION_DAYS}d" --include "territoire_*.dump.age" "$BACKUP_REMOTE/monthly"
	fi
	log "Sauvegarde terminée : daily/territoire_$stamp.dump.age"
}

fetch() {
	require BACKUP_REMOTE
	local file="${1:?Usage : db-backup fetch daily/territoire_<date>.dump.age}"
	rclone copyto "$BACKUP_REMOTE/$file" /restauration/territoire.dump.age
	age --decrypt --identity /restauration/cle.txt --output /restauration/territoire.dump /restauration/territoire.dump.age
	pg_restore --list /restauration/territoire.dump > /dev/null
	log "Sauvegarde $file prête à restaurer : /restauration/territoire.dump"
}

ping_healthcheck() {
	[ -n "${BACKUP_HEALTHCHECK_URL:-}" ] || return 0
	curl -fsS -m 10 --retry 3 -o /dev/null "$BACKUP_HEALTHCHECK_URL$1" || log "Ping de supervision impossible" >&2
}

schedule() {
	require_all
	log "Sauvegarde quotidienne à $BACKUP_TIME UTC vers $BACKUP_REMOTE"
	local now next
	while true; do
		now=$(date -u +%s)
		next=$(date -u -d "today $BACKUP_TIME" +%s)
		[ "$next" -gt "$now" ] || next=$(date -u -d "tomorrow $BACKUP_TIME" +%s)
		sleep $((next - now))
		# Processus séparé : set -e reste actif pendant la sauvegarde même si son échec est géré ici
		if "$0" run; then
			ping_healthcheck ""
		else
			log "ÉCHEC de la sauvegarde" >&2
			ping_healthcheck /fail
		fi
	done
}

case "${1:-schedule}" in
	schedule) schedule ;;
	run) backup ;;
	list)
		require BACKUP_REMOTE
		rclone lsl "$BACKUP_REMOTE" | sort -k4
		;;
	fetch) fetch "${2:-}" ;;
	*) exec "$@" ;;
esac
