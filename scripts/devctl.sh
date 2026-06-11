#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="$ROOT_DIR/.dev"
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

ensure_dirs() {
  mkdir -p \
    "$DEV_DIR" \
    "$ROOT_DIR/backend/data" \
    "$ROOT_DIR/backend/storage/private" \
    "$ROOT_DIR/backend/storage/public"
}

pid_from_file() {
  local pid_file="$1"

  if [ -f "$pid_file" ]; then
    tr -d '[:space:]' < "$pid_file"
  fi
}

is_running() {
  local pid="${1:-}"

  [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null
}

terminate_pid() {
  local pid="$1"

  if ! is_running "$pid"; then
    return
  fi

  kill "$pid" 2>/dev/null || true
  for _ in {1..25}; do
    if ! is_running "$pid"; then
      return
    fi
    sleep 0.2
  done

  kill -KILL "$pid" 2>/dev/null || true
}

port_pids() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
  fi
}

show_port() {
  local label="$1"
  local port="$2"

  if ! command -v lsof >/dev/null 2>&1; then
    echo "$label port $port: lsof niedostępny"
    return
  fi

  local output
  output="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$output" ]; then
    echo "$label port $port:"
    echo "$output"
  else
    echo "$label port $port: wolny"
  fi
}

is_known_dev_process() {
  local label="$1"
  local pid="$2"
  local command
  local process_files
  command="$(ps -p "$pid" -ww -o command= 2>/dev/null || true)"
  process_files="$(lsof -nP -p "$pid" 2>/dev/null || true)"

  if [[ "$command" == *"$ROOT_DIR"* || "$process_files" == *"$ROOT_DIR"* ]]; then
    return 0
  fi
  if [ "$label" = "Backend" ] && [[ "$command" == *"uvicorn app.main:app"* ]]; then
    return 0
  fi
  if [ "$label" = "Frontend" ] && [[ "$command" == *"vite"* ]]; then
    return 0
  fi

  return 1
}

service_status() {
  local label="$1"
  local pid_file="$2"
  local port="$3"
  local url="$4"
  local health_path="${5:-}"
  local pid
  pid="$(pid_from_file "$pid_file")"

  if is_running "$pid"; then
    echo "$label: działa, PID $pid, $url"
  elif [ -n "$pid" ]; then
    echo "$label: PID $pid nie działa, usuń stale dane komendą make stop"
  else
    echo "$label: nieuruchomiony"
  fi

  show_port "$label" "$port"

  if command -v curl >/dev/null 2>&1; then
    if curl -fsS --max-time 2 "$url$health_path" >/dev/null 2>&1; then
      echo "$label health: OK"
    else
      echo "$label health: brak odpowiedzi"
    fi
  fi
}

fail_if_port_busy() {
  local label="$1"
  local port="$2"
  local pids
  pids="$(port_pids "$port")"

  if [ -n "$pids" ]; then
    echo "$label nie wystartuje: port $port jest zajęty."
    show_port "$label" "$port"
    echo "Uruchom make status albo make stop. Jeśli to obcy proces, zakończ go świadomie po PID."
    return 1
  fi
}

run_migrations() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] alembic upgrade head" >> "$BACKEND_LOG"
  (
    cd "$ROOT_DIR/backend"
    "$PYTHON_BIN" -m alembic -c alembic.ini upgrade head
  ) >> "$BACKEND_LOG" 2>&1
}

start_backend() {
  ensure_dirs

  local pid
  pid="$(pid_from_file "$BACKEND_PID_FILE")"
  if is_running "$pid"; then
    echo "Backend już działa: $BACKEND_URL, PID $pid"
    return
  fi
  rm -f "$BACKEND_PID_FILE"

  fail_if_port_busy "Backend" "$BACKEND_PORT"
  run_migrations

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] start backend $BACKEND_URL" >> "$BACKEND_LOG"
  (
    cd "$ROOT_DIR/backend"
    nohup "$PYTHON_BIN" -m uvicorn app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" --lifespan off \
      </dev/null >> "$BACKEND_LOG" 2>&1 &
    echo "$!" > "$BACKEND_PID_FILE"
  )

  pid="$(pid_from_file "$BACKEND_PID_FILE")"
  sleep 1

  if ! is_running "$pid"; then
    echo "Backend nie wystartował. Ostatnie logi:"
    tail -n 40 "$BACKEND_LOG" || true
    return 1
  fi

  echo "Backend: $BACKEND_URL, PID $pid"
}

start_frontend() {
  ensure_dirs

  local pid
  pid="$(pid_from_file "$FRONTEND_PID_FILE")"
  if is_running "$pid"; then
    echo "Frontend już działa: $FRONTEND_URL, PID $pid"
    return
  fi
  rm -f "$FRONTEND_PID_FILE"

  fail_if_port_busy "Frontend" "$FRONTEND_PORT"

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] start frontend $FRONTEND_URL" >> "$FRONTEND_LOG"
  (
    cd "$ROOT_DIR/frontend"
    nohup ./node_modules/.bin/vite --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" --strictPort \
      </dev/null >> "$FRONTEND_LOG" 2>&1 &
    echo "$!" > "$FRONTEND_PID_FILE"
  )

  pid="$(pid_from_file "$FRONTEND_PID_FILE")"
  sleep 1

  if ! is_running "$pid"; then
    echo "Frontend nie wystartował. Ostatnie logi:"
    tail -n 40 "$FRONTEND_LOG" || true
    return 1
  fi

  echo "Frontend: $FRONTEND_URL, PID $pid"
}

stop_service() {
  local label="$1"
  local pid_file="$2"
  local log_file="$3"
  local port="$4"
  local pid
  pid="$(pid_from_file "$pid_file")"

  if is_running "$pid"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] stop $label PID $pid" >> "$log_file"
    terminate_pid "$pid"
  fi

  local port_pid
  for port_pid in $(port_pids "$port"); do
    if is_known_dev_process "$label" "$port_pid"; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] stop $label port $port PID $port_pid" >> "$log_file"
      terminate_pid "$port_pid"
    else
      echo "$label: port $port trzyma obcy proces PID $port_pid"
    fi
  done

  rm -f "$pid_file"
  if [ -n "$pid" ] || [ -n "$(port_pids "$port")" ]; then
    echo "$label: stop wykonany"
  else
    rm -f "$pid_file"
    echo "$label: zatrzymany"
  fi
}

start_all() {
  start_backend
  start_frontend
  echo
  echo "Mapa: $FRONTEND_URL"
  echo "API:  $BACKEND_URL"
}

stop_all() {
  ensure_dirs
  stop_service "Frontend" "$FRONTEND_PID_FILE" "$FRONTEND_LOG" "$FRONTEND_PORT"
  stop_service "Backend" "$BACKEND_PID_FILE" "$BACKEND_LOG" "$BACKEND_PORT"
  echo
  show_port "Backend" "$BACKEND_PORT"
  show_port "Frontend" "$FRONTEND_PORT"
}

status_all() {
  ensure_dirs
  service_status "Backend" "$BACKEND_PID_FILE" "$BACKEND_PORT" "$BACKEND_URL" "/health"
  echo
  service_status "Frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT" "$FRONTEND_URL"
}

logs_all() {
  ensure_dirs

  if [ "${2:-}" = "-f" ]; then
    touch "$BACKEND_LOG" "$FRONTEND_LOG"
    tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
    return
  fi

  echo "== backend =="
  tail -n "${DEV_LOG_LINES:-80}" "$BACKEND_LOG" 2>/dev/null || echo "brak logów"
  echo
  echo "== frontend =="
  tail -n "${DEV_LOG_LINES:-80}" "$FRONTEND_LOG" 2>/dev/null || echo "brak logów"
}

usage() {
  cat <<EOF
Użycie:
  make start      uruchamia backend i frontend
  make stop       zatrzymuje procesy z .dev/*.pid
  make restart    robi stop i start
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
