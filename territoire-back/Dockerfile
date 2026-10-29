# Étape 1 : Build de l'application
FROM eclipse-temurin:25-jdk-alpine AS builder
WORKDIR /app

COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline

COPY src src
RUN ./mvnw clean package -DskipTests

# Étape 2 : Runtime
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# Correctifs de sécurité Alpine publiés depuis la dernière image eclipse-temurin
# (ex. brotli-libs, CVE-2026-111497, signalée par Trivy avant la reconstruction de l'image de base)
RUN apk upgrade --no-cache

# Exécution sans les droits root
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/target/*.jar /app/app.jar
USER app

# OpenTelemetry : pas d'agent Java, l'export OTLP est fait par Spring Boot (cf. application-docker.properties).
# Ne pas définir de variables OTEL_* ici : Spring Boot les lit et elles priment sur la configuration de l'application.

# Fuseau horaire explicite : les dates métier (LocalDate.now()) et les tâches de nuit suivent l'heure de Paris
ENV JAVA_OPTS="-Xms256m -Xmx512m -Duser.timezone=Europe/Paris"
ENV SPRING_PROFILES_ACTIVE=docker

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/actuator/health || exit 1
CMD ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
