# ==========================================
# Build Stage
# ==========================================
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Copy Maven dependency descriptor
COPY pom.xml .

# Download dependencies (cached layer unless pom.xml changes)
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build production JAR package without running unit tests
RUN mvn clean package -DskipTests

# ==========================================
# Run Stage
# ==========================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root system user for security
RUN addgroup -S keystone && adduser -S keystone -G keystone

# Copy built artifact from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Set ownership
RUN chown -R keystone:keystone /app

USER keystone

EXPOSE 8080

ENV SPRING_PROFILES_ACTIVE=postgres

ENTRYPOINT ["java", "-jar", "app.jar"]
