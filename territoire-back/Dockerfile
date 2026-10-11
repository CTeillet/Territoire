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

# Exécution sans les droits root
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/target/*.jar /app/app.jar
COPY --chown=app:app opentelemetry-javaagent.jar /app/opentelemetry-javaagent.jar
USER app

# Active l’agent pour tous les lancements Java
ENV JAVA_TOOL_OPTIONS="-javaagent:/app/opentelemetry-javaagent.jar"

# Vars OTel (quotes pour éviter les soucis)
ENV OTEL_SERVICE_NAME="territoire-back" \
    OTEL_EXPORTER_OTLP_ENDPOINT="http://collector:4317" \
    OTEL_EXPORTER_OTLP_PROTOCOL="grpc" \
    OTEL_TRACES_EXPORTER="otlp" \
    OTEL_METRICS_EXPORTER="otlp" \
    OTEL_LOGS_EXPORTER="otlp" \
    OTEL_TRACES_SAMPLER="parentbased_always_on"

# ⚠️ Mettre la ressource dans un ENV séparé pour l'égalité interne
ENV OTEL_RESOURCE_ATTRIBUTES="deployment.environment=docker"

# (optionnel) corrélation logs ↔ traces
ENV OTEL_INSTRUMENTATION_LOGS_ENABLED="true" \
    OTEL_INSTRUMENTATION_LOGS_CAPTURE_EXPERIMENTAL_ATTRIBUTES="true"

# Fuseau horaire explicite : les dates métier (LocalDate.now()) et les tâches de nuit suivent l'heure de Paris
ENV JAVA_OPTS="-Xms256m -Xmx512m -Duser.timezone=Europe/Paris"
ENV SPRING_PROFILES_ACTIVE=docker

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/actuator/health || exit 1
CMD ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
