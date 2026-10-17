# Image du service db-backup (docker-compose.yml) : pg_dump, age (chiffrement) et rclone (envoi externe)
FROM rclone/rclone:1.75.1 AS rclone

# Seul le client PostgreSQL sert : même version majeure que le serveur (postgis/postgis:latest = 17-3.5),
# à monter en même temps que lui. Pas l'image postgis : elle repose sur Debian bullseye, dont les dépôts ne répondent plus.
FROM postgres:17-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends age ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=rclone /usr/local/bin/rclone /usr/local/bin/rclone
COPY db-backup.sh /usr/local/bin/db-backup
RUN chmod 755 /usr/local/bin/db-backup

ENTRYPOINT ["/usr/local/bin/db-backup"]
CMD ["schedule"]
