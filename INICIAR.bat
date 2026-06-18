@echo off
chcp 65001 >nul
title Academia J Rubio - Servidor local
cd /d "%~dp0"

echo ============================================
echo   Academia J Rubio - Arranque local
echo ============================================
echo.

REM --- Asegurar pnpm disponible ---
where pnpm >nul 2>nul
if errorlevel 1 (
  echo [info] pnpm no encontrado, activando con corepack...
  corepack enable >nul 2>nul
  corepack prepare pnpm@9.12.0 --activate >nul 2>nul
)
where pnpm >nul 2>nul
if errorlevel 1 (
  echo [info] Instalando pnpm globalmente con npm...
  call npm install -g pnpm@9.12.0
)

echo [1/4] Compilando paquete storage...
call pnpm --filter @academia/storage build

echo [2/4] Generando cliente Prisma (segun el schema actual)...
call pnpm --filter @academia/db generate

echo [3/4] Compilando paquete db...
call pnpm --filter @academia/db build

echo.
echo [4/4] Levantando WEB (http://localhost:3000) y API (http://localhost:4000)...
echo       Deja esta ventana abierta. Para detener: Ctrl + C.
echo.

REM Abrir el navegador en la landing despues de unos segundos
start "" cmd /c "timeout /t 15 >nul & start http://localhost:3000"

call pnpm dev

echo.
echo El servidor se detuvo. Presiona una tecla para cerrar.
pause >nul
