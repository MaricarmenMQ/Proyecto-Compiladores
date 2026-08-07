#!/usr/bin/env sh
set -e
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$ROOT"
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js 18 o superior es necesario para la capa de IA."
  exit 1
fi
node backend/server.js > /tmp/sam-lang-studio.log 2>&1 &
SERVER_PID=$!
sleep 1
URL="http://127.0.0.1:3000"
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then open "$URL" || true
else echo "Abra manualmente: $URL"
fi
echo "SAM-Lang Studio ejecutándose en $URL (PID $SERVER_PID)"
echo "Log: /tmp/sam-lang-studio.log"
