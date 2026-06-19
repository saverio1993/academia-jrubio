@echo off
chcp 65001 >nul
title Academia J Rubio - Subir a GitHub
cd /d "%~dp0"

echo ============================================
echo   Subir Academia J Rubio a GitHub
echo   Repo: https://github.com/saverio1993/academia-jrubio
echo ============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git no esta instalado o no esta en el PATH.
  echo Instala Git desde https://git-scm.com/download/win y vuelve a intentar.
  pause
  exit /b 1
)

if not exist ".git" (
  echo Inicializando repositorio git...
  git init
  git branch -M main
)

for /f "delims=" %%i in ('git config user.email') do set HASEMAIL=%%i
if "%HASEMAIL%"=="" (
  git config user.email "saveriomanrrique19@gmail.com"
  git config user.name "Saverio Manrrique"
)

REM Conectar con el repositorio remoto
git remote remove origin >nul 2>nul
git remote add origin https://github.com/saverio1993/academia-jrubio.git

echo.
echo Guardando tus cambios locales...
git add .
git commit -m "Fix Prisma en Vercel: binaryTargets + serverExternalPackages"

echo.
echo Sincronizando con GitHub (trae el merge del PR de seguridad)...
git config pull.rebase false
git pull origin main --no-edit

echo.
echo Subiendo a GitHub... (si pide login, inicia sesion en la ventana de GitHub)
git push -u origin main

echo.
if errorlevel 1 (
  echo [!] Algo fallo. Lee el mensaje de arriba y mandame captura.
) else (
  echo [OK] Listo. Vercel detectara el cambio y volvera a desplegar solo.
  echo     Espera 2-3 minutos y prueba el login de nuevo.
)
echo.
pause
