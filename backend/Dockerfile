# Use the official Java 21 LTS runtime
FROM eclipse-temurin:21-jdk

# Set the working directory inside the container
WORKDIR /app

# Copy the backend files to the container
COPY . .

# Ensure the Maven wrapper has execution permissions
RUN chmod +x mvnw

# Build the Spring Boot application (skipping tests for speed)
RUN ./mvnw clean package -DskipTests

# Expose port 8080 to the outside world
EXPOSE 8080

# Run the generated jar file
CMD ["sh", "-c", "java -jar target/*.jar"]