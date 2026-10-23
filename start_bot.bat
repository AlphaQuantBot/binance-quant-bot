@echo off
title Binance Quant AI Scalper & DEX Terminal
echo =======================================================
echo   Alfa Quant Bot - Autonomous Terminal Baslatiliyor
echo =======================================================
echo.
echo [1/3] Bagimliliklar kontrol ediliyor...
call npm install
echo.
echo [2/3] Tarayici ve Yerel Program Baslatiliyor...
timeout /t 2 /nobreak >nul
start http://localhost:3000
echo.
echo [3/3] Sunucu ve WebSocket motoru calisiyor...
npm run dev
pause
