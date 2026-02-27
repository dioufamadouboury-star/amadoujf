@echo off
chcp 65001 >nul 2>&1
title GROUPE YAMA+ - Lancement du site

echo ==========================================
echo    GROUPE YAMA+ - Lancement du site
echo ==========================================
echo.

:: Vérifier si Node.js est installé
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe ou n'est pas dans le PATH.
    echo.
    echo Veuillez installer Node.js depuis : https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Afficher les versions
echo [INFO] Verification des versions...
for /f "tokens=*" %%i in ('node --version') do echo Node.js: %%i
for /f "tokens=*" %%i in ('npm --version') do echo npm: %%i
echo.

:: Se placer dans le dossier frontend
cd /d "%~dp0frontend"
if %errorlevel% neq 0 (
    echo [ERREUR] Impossible d'acceder au dossier frontend.
    pause
    exit /b 1
)

:: Vérifier si node_modules existe
if not exist "node_modules" (
    echo [INFO] Installation des dependances...
    echo Cela peut prendre quelques minutes...
    echo.
    npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo.
        echo [ERREUR] L'installation des dependances a echoue.
        echo Essayez de supprimer node_modules et package-lock.json puis relancez ce script.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependances installees avec succes.
    echo.
)

:: Lancer le serveur en arrière-plan
echo [INFO] Lancement du serveur de developpement...
echo.
echo Le site sera accessible sur : http://localhost:3000
echo.
echo Patientez pendant le demarrage...
echo (Appuyez sur Ctrl+C pour arreter le serveur)
echo.

:: Ouvrir le navigateur après un délai
start "" cmd /c "timeout /t 15 /nobreak >nul && start http://localhost:3000"

:: Lancer npm start
npm start

pause
