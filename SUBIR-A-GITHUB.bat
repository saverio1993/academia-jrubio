@echo off
chcp 65001 >nul
title Academia J Rubio - Subir a GitHub
cd /d "%~dp0"

echo ============================================
echo   Subir Academia J Rubio a GitHub
echo   Repo: https://github.com/saverio1993/academia-jrubio
echo ============================================
echo.

REM --- Verificar git ---
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git no esta instalado o no esta en el PATH.
  echo Instala Git desde https://git-scm.com/download/win y vuelve a intentar.
  pause
  exit /b 1
)

REM --- Inicializar repo si hace falta ---
if not exist ".git" (
  echo Inicializando repositorio git...
  git init
  git branch -M main
)

REM --- Identidad git (por si no esta configurada) ---
for /f "delims=" %%i in ('git config user.email') do set HASEMAIL=%%i
if "%HASEMAIL%"=="" (
  git config user.email "saveriomanrrique19@gmail.com"
  git config user.name "Saverio Manrrique"
)

REM --- Seguridad: confirmar que .env esta ignorado ---
echo Comprobando que tus credenciales (.env) NO se suban...
git check-ignore .env >nul 2>nul
if errorlevel 1 (
  echo [ADVERTENCIA] .env podria NO estar ignorado. Revisa .gitignore antes de continuar.
  pause
)

echo.
echo Agregando archivos (los .env quedan excluidos por .gitignore)...
git add .
git commit -m "Academia J Rubio - plataforma SaaS (Fase 1 y Fase 3)"

echo.
echo Conectando con el repositorio de GitHub...
git remote remove origin >nul 2>nul
git remote add origin https://github.com/saverio1993/academia-jrubio.git

echo.
echo Subiendo... (se abrira una ventana de GitHub para que inicies sesion con TU cuenta)
git push -u origin main

echo.
if errorlevel 1 (
  echo [!] Algo fallo en el push. Lee el mensaje de arriba.
  echo     Si pide login, inicia sesion en la ventana de GitHub que aparece.
) else (
  echo [OK] Listo. Tu codigo ya esta en:
  echo     https://github.com/saverio1993/academia-jrubio
)
echo.
pause
