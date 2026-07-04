#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="${DEV_DIR:-$ROOT_DIR/.dev}"
PYTHON_BIN="${PYTHON:-python3}"

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5174}"

BACKEND_URL="http://$BACKEND_HOST:$BACKEND_PORT"
FRONTEND_URL="http://$FRONTEND_HOST:$FRONTEND_PORT"
BACKEND_PID_FILE="$DEV_DIR/backend.pid"
FRONTEND_PID_FILE="$DEV_DIR/frontend.pid"
BACKEND_LOG="$DEV_DIR/backend.log"
FRONTEND_LOG="$DEV_DIR/frontend.log"

if [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
  PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
fi

export ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token}"
export FRONTEND_ORIGINS="${FRONTEND_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173,http://localhost:$FRONTEND_PORT,http://$FRONTEND_HOST:$FRONTEND_PORT}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-$BACKEND_URL}"

# shellcheck source=scripts/dev/process.sh
source "$ROOT_DIR/scripts/dev/process.sh"
# shellcheck source=scripts/dev/services.sh
source "$ROOT_DIR/scripts/dev/services.sh"

usage() {
  cat <<EOF
Użycie:
  make start      uruchamia backend i frontend
  make stop       zatrzymuje procesy z .dev/*.pid
  make restart    robi stop i start lokalnego dev; nie restartuje publicznego runtime
  make status     pokazuje PID, porty i health
  make logs       pokazuje ostatnie logi
  make check      odpala pełny check projektu

Bez make:
  ./scripts/devctl.sh start|stop|restart|status|logs|logs -f|check
EOF
}

case "${1:-status}" in
  start)
    start_all
    ;;
  stop)
    stop_all
    ;;
  restart)
    stop_all
    echo
    start_all
    ;;
  status)
    status_all
    ;;
  logs)
    logs_all "$@"
    ;;
  check)
    exec "$ROOT_DIR/scripts/check.sh"
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    usage
    exit 2
    ;;
esac
