#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-local}"
export JWT_SECRET="${JWT_SECRET:-ww_local_demo_secret_1234567890123456}"
export JWT_EXPIRATION="${JWT_EXPIRATION:-86400000}"
export APP_SEED_DEMO_DATA="${APP_SEED_DEMO_DATA:-true}"

# Keep local startup on H2 even if MySQL variables exist in the shell.
unset MYSQL_URL MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASSWORD MYSQL_DB

export VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"
export VITE_SHOW_DEMO_ACCOUNTS="${VITE_SHOW_DEMO_ACCOUNTS:-true}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1"
    echo "Install it first, then run this script again."
    exit 1
  fi
}

require_command mvn
require_command npm

port_in_use() {
  command -v ss >/dev/null 2>&1 && ss -ltn | awk '{print $4}' | grep -Eq "[:.]$1$"
}

BACKEND_PORT_IN_USE=false
FRONTEND_PORT_IN_USE=false
if port_in_use 8080; then
  BACKEND_PORT_IN_USE=true
fi
if port_in_use 5173; then
  FRONTEND_PORT_IN_USE=true
fi

if [ "$BACKEND_PORT_IN_USE" = true ] || [ "$FRONTEND_PORT_IN_USE" = true ]; then
  echo "Cannot start because one or more required ports are already in use:"
  if [ "$BACKEND_PORT_IN_USE" = true ]; then
    echo "- 8080: backend port"
  fi
  if [ "$FRONTEND_PORT_IN_USE" = true ]; then
    echo "- 5173: frontend port"
  fi
  echo
  echo "If the app is already running, open http://localhost:5173."
  echo "Otherwise stop the existing process first, then run ./start-wsl.sh again."
  exit 1
fi

if [ ! -d "$ROOT_DIR/frontend-react/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$ROOT_DIR/frontend-react" && npm ci)
fi

echo "Starting backend at http://localhost:8080 ..."
(cd "$ROOT_DIR/backend-java" && mvn -q -DskipTests spring-boot:run) &
BACKEND_PID=$!

echo "Starting frontend at http://localhost:5173 ..."
(cd "$ROOT_DIR/frontend-react" && npm run dev -- --host 0.0.0.0) &
FRONTEND_PID=$!

cleanup() {
  echo
  echo "Stopping backend/frontend..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait "$BACKEND_PID" "$FRONTEND_PID"
