#!/usr/bin/env bash
# Déploiement sur le VPS, lancé par le workflow « Build and Deploy » depuis le dossier du projet (~/territoire) :
#
#   bash .deploy/deploy/deploy.sh <tag back> <tag front>
#
# Le workflow dépose dans .deploy la version à déployer de docker-compose.yml, de config/ et de ce script.
# Les images ghcr.io/cteillet/territoire-back:<tag back> et territoire-front:<tag front> doivent exister sur GHCR.
#
# 1. Met en place docker-compose.yml et config/ depuis .deploy.
# 2. Fait pointer le tag latest local, celui de docker-compose.yml, sur les images à déployer.
# 3. docker compose up -d : seuls les services dont l'image ou la définition a changé sont recréés (PostGIS reste en place),
#    puis les services dont la configuration montée depuis config/ a changé sont redémarrés.
# 4. Attend que le back et le front soient en bonne santé ; sinon remet les images précédentes et échoue.
set -euo pipefail

BACK_IMAGE=ghcr.io/cteillet/territoire-back
FRONT_IMAGE=ghcr.io/cteillet/territoire-front
STAGING=.deploy
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-240}"
# Fichier ou dossier de config/ monté par chaque service : docker compose ne voit pas quand il change
MOUNTED_CONFIG=(
	"otel-collector-config.yaml collector"
	"prometheus-config.yaml prometheus"
	"loki-config.yaml loki"
	"tempo-config.yaml tempo"
	"grafana grafana"
)

log() {
	echo "$(date -u '+%F %T') $*"
}

wait_healthy() {
	local container status waited
	for container in territoire-back territoire-front; do
		waited=0
		while true; do
			status=$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null || echo absent)
			[ "$status" = healthy ] && break
			if [ "$status" = unhealthy ] || [ "$waited" -ge "$HEALTH_TIMEOUT_SECONDS" ]; then
				log "$container n'est pas en bonne santé (état : $status, après $waited s)"
				return 1
			fi
			sleep 5
			waited=$((waited + 5))
		done
		log "$container en bonne santé"
	done
}

if [ $# -ne 2 ]; then
	echo "Usage : $0 <tag back> <tag front>" >&2
	exit 2
fi
back_tag=$1
front_tag=$2
if [ ! -f "$STAGING/docker-compose.yml" ] || [ ! -d "$STAGING/config" ]; then
	log "$STAGING/docker-compose.yml ou $STAGING/config manquant : à lancer depuis ~/territoire après la copie du workflow" >&2
	exit 1
fi

log "Téléchargement de $BACK_IMAGE:$back_tag et $FRONT_IMAGE:$front_tag"
docker pull --quiet "$BACK_IMAGE:$back_tag"
docker pull --quiet "$FRONT_IMAGE:$front_tag"

# Images en service avant le déploiement, pour revenir en arrière
previous_back=$(docker inspect --format '{{.Image}}' territoire-back 2>/dev/null || true)
previous_front=$(docker inspect --format '{{.Image}}' territoire-front 2>/dev/null || true)

restart=()
for entry in "${MOUNTED_CONFIG[@]}"; do
	read -r path service <<< "$entry"
	if ! diff -rq "config/$path" "$STAGING/config/$path" > /dev/null 2>&1; then
		restart+=("$service")
	fi
done
mv "$STAGING/docker-compose.yml" docker-compose.yml
rm -rf config
mv "$STAGING/config" config

# latest désigne toujours la version déployée : docker-compose.yml et les commandes lancées à la main s'en servent
docker tag "$BACK_IMAGE:$back_tag" "$BACK_IMAGE:latest"
docker tag "$FRONT_IMAGE:$front_tag" "$FRONT_IMAGE:latest"

log "Mise à jour des services"
docker compose up -d
if [ ${#restart[@]} -gt 0 ]; then
	log "Configuration modifiée, redémarrage de : ${restart[*]}"
	docker compose restart "${restart[@]}"
fi

if wait_healthy; then
	# En local, seul latest est gardé : les autres versions restent sur GHCR
	for image in "$BACK_IMAGE" "$FRONT_IMAGE"; do
		docker image ls --format '{{.Repository}}:{{.Tag}}' "$image" | grep -v ':latest$' | xargs -r docker image rm > /dev/null || true
	done
	docker image prune -f > /dev/null
	rm -rf "$STAGING"
	log "Déploiement terminé"
	exit 0
fi

log "Échec du déploiement : retour aux images précédentes"
docker compose logs --tail 50 territoire-back territoire-front || true
if [ -n "$previous_back" ]; then
	docker tag "$previous_back" "$BACK_IMAGE:latest"
fi
if [ -n "$previous_front" ]; then
	docker tag "$previous_front" "$FRONT_IMAGE:latest"
fi
docker compose up -d
if wait_healthy; then
	log "Images précédentes remises en service"
else
	log "Les images précédentes ne sont pas en bonne santé non plus : intervention nécessaire"
fi
exit 1
