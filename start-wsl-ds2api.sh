#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DS2API_DIR="$ROOT_DIR/ds2api-main"

DS2API_PORT="${DS2API_PORT:-5001}"
DS2API_API_KEY="${DS2API_API_KEY:-stylist-local-key}"
DS2API_ADMIN_KEY="${DS2API_ADMIN_KEY:-admin}"
DS2API_CONFIG_PATH="${DS2API_CONFIG_PATH:-$DS2API_DIR/config.json}"

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-local,ds2api}"
export JWT_SECRET="${JWT_SECRET:-ww_local_demo_secret_1234567890123456}"
export JWT_EXPIRATION="${JWT_EXPIRATION:-86400000}"
export APP_SEED_DEMO_DATA="${APP_SEED_DEMO_DATA:-true}"
export DS2API_BASE_URL="${DS2API_BASE_URL:-http://127.0.0.1:$DS2API_PORT/v1}"
export DS2API_API_KEY
export STYLE_AI_MODEL="${STYLE_AI_MODEL:-deepseek-v4-flash}"
export STYLE_AI_ENABLED="${STYLE_AI_ENABLED:-true}"

export VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"
export VITE_SHOW_DEMO_ACCOUNTS="${VITE_SHOW_DEMO_ACCOUNTS:-true}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1"
    exit 1
  fi
}

port_in_use() {
  command -v ss >/dev/null 2>&1 && ss -ltn | awk '{print $4}' | grep -Eq "[:.]$1$"
}

require_command go
require_command mvn
require_command npm

if [ ! -d "$DS2API_DIR" ]; then
  echo "Missing DS2API directory: $DS2API_DIR"
  exit 1
fi

if [ ! -f "$DS2API_CONFIG_PATH" ]; then
  echo "Missing DS2API config: $DS2API_CONFIG_PATH"
  echo "Create it from ds2api-main/config.wealthwallet.example.json and add your DeepSeek account/token."
  exit 1
fi

for port in "$DS2API_PORT" 8080 5173; do
  if port_in_use "$port"; then
    echo "Port $port is already in use. Stop the existing process first."
    exit 1
  fi
done

if [ ! -d "$ROOT_DIR/frontend-react/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$ROOT_DIR/frontend-react" && npm ci)
fi

echo "Starting DS2API at http://127.0.0.1:$DS2API_PORT ..."
(cd "$DS2API_DIR" && PORT="$DS2API_PORT" DS2API_ADMIN_KEY="$DS2API_ADMIN_KEY" DS2API_CONFIG_PATH="$DS2API_CONFIG_PATH" go run ./cmd/ds2api) &
DS2API_PID=$!

echo "Starting backend at http://localhost:8080 with AI stylist via $DS2API_BASE_URL ..."
(cd "$ROOT_DIR/backend-java" && mvn -q -DskipTests spring-boot:run) &
BACKEND_PID=$!

echo "Starting frontend at http://localhost:5173 ..."
(cd "$ROOT_DIR/frontend-react" && npm run dev -- --host 0.0.0.0) &
FRONTEND_PID=$!

cleanup() {
  echo
  echo "Stopping DS2API/backend/frontend..."
  kill "$DS2API_PID" "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait "$DS2API_PID" "$BACKEND_PID" "$FRONTEND_PID"
