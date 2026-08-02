@echo off
echo ==========================================================
echo       Starting Keystone Field Service Management
echo ==========================================================

echo Starting Spring Boot Backend in a new window...
start "Keystone Backend" cmd /k "cd backend && ..\.maven\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run"

echo Starting React Frontend in a new window...
start "Keystone Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================================
echo Platform Launched Successfully!
echo.
echo Frontend URL: http://localhost:5173
echo Backend API:  http://localhost:8080
echo Swagger Docs: http://localhost:8080/swagger-ui/index.html
echo ==========================================================
echo.
pause
