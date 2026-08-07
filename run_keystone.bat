@echo off
setlocal
echo ==========================================================
echo       Starting Keystone Field Service Management
echo ==========================================================

set "JAVA_HOME=C:\Users\borud\AppData\Local\jdks\jdk-25.0.2"
if not exist "%JAVA_HOME%\bin\java.exe" (
	echo JDK 25 was not found at "%JAVA_HOME%".
	echo Please install it there or update run_keystone.bat with your local JDK 25 path.
	pause
	exit /b 1
)
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Starting Spring Boot Backend in a new window...
start "Keystone Backend" cmd /k "set \"JAVA_HOME=%JAVA_HOME%\" && set \"PATH=%JAVA_HOME%\bin;%PATH%\" && cd /d \"%~dp0backend\" && call ..\.maven\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run"

echo Starting React Frontend in a new window...
start "Keystone Frontend" cmd /k "cd /d \"%~dp0frontend\" && npm run dev"

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
