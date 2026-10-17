# Image du service db-backup (docker-compose.yml) : pg_dump, age (chiffrement) et rclone (envoi externe)
FROM rclone/rclone:1.75.1 AS rclone

# Même image que le serveur : pg_dump et pg_restore suivent sa version majeure
FROM postgis/postgis:latest

RUN apt-get update \
    && apt-get install -y --no-install-recommends age ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=rclone /usr/local/bin/rclone /usr/local/bin/rclone
COPY db-backup.sh /usr/local/bin/db-backup
RUN chmod 755 /usr/local/bin/db-backup

ENTRYPOINT ["/usr/local/bin/db-backup"]
CMD ["schedule"]
