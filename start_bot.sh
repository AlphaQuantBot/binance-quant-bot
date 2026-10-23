#!/usr/bin/env bash
echo "======================================================="
echo "  Alfa Quant Bot - Autonomous Terminal Baslatiliyor"
echo "======================================================="
echo ""
echo "[1/3] Bagimliliklar kontrol ediliyor..."
npm install
echo ""
echo "[2/3] Tarayici ve Yerel Program Baslatiliyor..."
sleep 2
if command -v xdg-open &> /dev/null; then
  xdg-open http://localhost:3000 &
elif command -v open &> /dev/null; then
  open http://localhost:3000 &
fi
echo ""
echo "[3/3] Sunucu ve WebSocket motoru calisiyor (http://localhost:3000)..."
npm run dev
