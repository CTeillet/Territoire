# Étape 1 : Build de l'application
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copier les fichiers Maven pour le cache des dépendances
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline

# Copier le code source et compiler
COPY src src
RUN ./mvnw clean package -DskipTests

# Étape 2 : Image minimale pour l'exécution
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copier l'application compilée depuis l'étape de build
COPY --from=builder /app/target/*.jar app.jar

# Exposer le port de l'application
EXPOSE 8080

# Définir des variables d'environnement pour la configuration
ENV JAVA_OPTS="-Xms256m -Xmx512m"

# Commande pour lancer l'application
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
