# Étape 1 : Build de l'application
FROM eclipse-temurin:23-jdk-alpine AS builder
WORKDIR /app

COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline

COPY src src
RUN ./mvnw clean package -DskipTests

# Étape 2 : Runtime
FROM eclipse-temurin:23-jre-alpine
WORKDIR /app

COPY --from=builder /app/target/*.jar /app/app.jar
COPY opentelemetry-javaagent.jar /app/opentelemetry-javaagent.jar

# Active l’agent pour tous les lancements Java
ENV JAVA_TOOL_OPTIONS="-javaagent:/app/opentelemetry-javaagent.jar"

# Vars OTel (quotes pour éviter les soucis)
ENV OTEL_SERVICE_NAME="territoire-back" \
    OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4317" \
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

ENV JAVA_OPTS="-Xms256m -Xmx512m"
ENV SPRING_PROFILES_ACTIVE=docker

EXPOSE 8080
CMD ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
