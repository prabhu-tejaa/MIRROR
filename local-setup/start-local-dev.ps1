# Ensure we are in the root directory of the project, regardless of where this is run from
Set-Location "$PSScriptRoot\.."

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
$env:DB_URL="jdbc:postgresql://localhost:5432/mirror_memory"
$env:DB_USERNAME="mirror_admin"
$env:DB_PASSWORD="mirror_secure_pass"
$env:JWT_SECRET="bG9jYWxfZGV2X3NlY3JldF9rZXlfbXVzdF9iZV9hdF9sZWFzdF8yNTZfYml0c19sb25nX2Zvcl9ocy1hbGdvcml0aG1z"
$env:MAIL_USERNAME="OPTIONAL_SMTP_USERNAME"
$env:MAIL_PASSWORD="OPTIONAL_SMTP_PASSWORD"
$env:MAIL_FROM="YOUR_EMAIL_ADDRESS"
$env:GEMINI_API_URL="https://generativelanguage.googleapis.com/v1beta"
$env:GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
$env:GROQ_API_URL="https://api.groq.com/openai/v1/chat/completions"
$env:GROQ_MODEL="llama3-8b-8192"
$env:GROQ_API_KEY="YOUR_GROQ_API_KEY_HERE"

# Set Environment Variables for Frontend
$env:MOCK="false" # Set to true to bypass backend and Firebase completely
$env:API_URL="http://localhost:8060"
$env:FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
$env:FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
$env:FIREBASE_DATABASE_URL="YOUR_FIREBASE_DATABASE_URL"
$env:FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
$env:FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
$env:FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
$env:FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"
$env:FIREBASE_MEASUREMENT_ID="YOUR_FIREBASE_MEASUREMENT_ID"

# Infrastructure defaults to ensure it points to local docker containers
$env:SPRING_RABBITMQ_HOST="localhost"
$env:SPRING_RABBITMQ_PORT="5672"
$env:SPRING_RABBITMQ_USERNAME="guest"
$env:SPRING_RABBITMQ_PASSWORD="guest"
$env:SPRING_RABBITMQ_VIRTUAL_HOST="/"
$env:SPRING_DATA_REDIS_HOST="localhost"
$env:SPRING_DATA_REDIS_PORT="6379"
$env:SPRING_DATA_REDIS_PASSWORD=""
$env:ZIPKIN_URL="http://localhost:9411/api/v2/spans"
$env:AUTH_SERVICE_URL="http://localhost:8080"
$env:MEMORY_SERVICE_URL="http://localhost:8081"

Write-Host "Starting backend services in new windows..." -ForegroundColor Cyan

# Start Auth Service
Start-Process cmd -ArgumentList "/k `"cd backend\auth-service && title Auth Service (8080) && ..\mvnw.cmd spring-boot:run`"" -WindowStyle Normal

# Start Memory Service
Start-Process cmd -ArgumentList "/k `"cd backend\memory-service && title Memory Service (8081) && ..\mvnw.cmd spring-boot:run`"" -WindowStyle Normal

# Start API Gateway
Start-Process cmd -ArgumentList "/k `"cd backend\api-gateway && title API Gateway (8060) && ..\mvnw.cmd spring-boot:run`"" -WindowStyle Normal

Write-Host "Starting frontend in a new window..." -ForegroundColor Cyan

# Check if npm install is needed
if (!(Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies first (this will take a minute)..." -ForegroundColor Yellow
    Start-Process cmd -ArgumentList "/c `"cd frontend && npm install`"" -Wait -WindowStyle Normal
}

# Start Frontend
Start-Process cmd -ArgumentList "/k `"cd frontend && title Frontend && npm start`"" -WindowStyle Normal

Write-Host "All services have been instructed to start!" -ForegroundColor Green
Write-Host "Please check the individual windows for any startup errors." -ForegroundColor Green
Write-Host "API Gateway will be available at: http://localhost:8060"
Write-Host "Frontend will be available at: http://localhost:4200"
