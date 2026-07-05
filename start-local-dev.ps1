Write-Host "Checking if Docker is running..." -ForegroundColor Cyan
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Docker is not running! Infrastructure dependencies (PostgreSQL, Redis, RabbitMQ) cannot be started." -ForegroundColor Yellow
    Write-Host "Please start Docker Desktop and then run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to continue starting services anyway, or Ctrl+C to abort..."
} else {
    Write-Host "Starting Docker Compose for infrastructure..." -ForegroundColor Green
    Set-Location backend
    docker compose up -d
    Set-Location ..
}

# Set Environment Variables for Microservices (Local Testing Defaults)
# These are required by application.yaml so the services don't crash on startup
$env:DB_URL="jdbc:postgresql://YOUR_NEON_DB_URL_HERE?sslmode=require"
$env:DB_USERNAME="YOUR_DB_USERNAME"
$env:DB_PASSWORD="YOUR_DB_PASSWORD"
$env:JWT_SECRET="YOUR_BASE64_ENCODED_JWT_SECRET_HERE"
$env:MAIL_USERNAME="YOUR_SMTP_USERNAME"
$env:MAIL_PASSWORD="YOUR_SMTP_PASSWORD"
$env:MAIL_FROM="YOUR_EMAIL_ADDRESS"
$env:GEMINI_API_URL="https://generativelanguage.googleapis.com/v1beta"
$env:GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"

# Infrastructure defaults to ensure it points to local docker containers
$env:SPRING_RABBITMQ_HOST="localhost"
$env:SPRING_RABBITMQ_PORT="5672"
$env:SPRING_RABBITMQ_USERNAME="guest"
$env:SPRING_RABBITMQ_PASSWORD="guest"
$env:SPRING_DATA_REDIS_HOST="localhost"
$env:SPRING_DATA_REDIS_PORT="6379"
$env:SPRING_DATA_REDIS_PASSWORD=""
$env:ZIPKIN_URL="http://localhost:9411/api/v2/spans"

Write-Host "Starting backend services in new windows..." -ForegroundColor Cyan

# Start Auth Service
Start-Process cmd -ArgumentList "/k `"cd backend\auth-service && title Auth Service (8080) && ..\mvnw spring-boot:run`"" -WindowStyle Normal

# Start Memory Service
Start-Process cmd -ArgumentList "/k `"cd backend\memory-service && title Memory Service (8081) && ..\mvnw spring-boot:run`"" -WindowStyle Normal

# Start API Gateway
Start-Process cmd -ArgumentList "/k `"cd backend\api-gateway && title API Gateway (8060) && ..\mvnw spring-boot:run`"" -WindowStyle Normal

Write-Host "Starting frontend in a new window..." -ForegroundColor Cyan

# Start Frontend
Start-Process cmd -ArgumentList "/k `"cd frontend && title Frontend && npm start`"" -WindowStyle Normal

Write-Host "All services have been instructed to start!" -ForegroundColor Green
Write-Host "Please check the individual windows for any startup errors." -ForegroundColor Green
Write-Host "API Gateway will be available at: http://localhost:8060"
Write-Host "Frontend will be available at: http://localhost:4200"
