#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="${DEV_DIR:-$ROOT_DIR/.dev}"
PYTHON_BIN="${PYTHON:-python3}"

SERVER_HOST="${PHOTOMAP_SERVER_HOST:-127.0.0.1}"
SERVER_PORT="${PHOTOMAP_SERVER_PORT:-8000}"
SERVER_URL="http://$SERVER_HOST:$SERVER_PORT"
SERVER_PID_FILE="$DEV_DIR/server.pid"
SERVER_LOG="$DEV_DIR/server.log"
AUTOSTART_DISABLED_FILE="$DEV_DIR/server.autostart.disabled"

TUNNEL_CONFIG="${PHOTOMAP_TUNNEL_CONFIG:-$ROOT_DIR/.cloudflared/config.yml}"
TUNNEL_PID_FILE="$DEV_DIR/cloudflared.pid"
TUNNEL_LOG="$DEV_DIR/cloudflared.log"

if [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
  PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
fi

export PHOTOMAP_SERVER_HOST="$SERVER_HOST"
export PHOTOMAP_SERVER_PORT="$SERVER_PORT"

# shellcheck source=scripts/dev/process.sh
source "$ROOT_DIR/scripts/dev/process.sh"

usage() {
  cat <<EOF
Użycie:
  make server-start       buduje frontend i uruchamia publiczny runtime PhotoMap
  make server-stop        zatrzymuje publiczny runtime PhotoMap
  make server-restart     restartuje publiczny runtime PhotoMap
  make server-status      pokazuje PID, port i health publicznego runtime
  make server-logs        pokazuje logi publicznego runtime
  make tunnel-start       uruchamia lokalny Cloudflare tunnel
  make tunnel-stop        zatrzymuje lokalny Cloudflare tunnel
  make autostart-start    włącza autostart, runtime i tunnel
  make autostart-stop     wyłącza autostart i zatrzymuje runtime oraz tunnel
EOF
}

ensure_runtime_dirs() {
  mkdir -p \
    "$DEV_DIR" \
    "$ROOT_DIR/backend/data" \
    "$ROOT_DIR/backend/storage/private" \
    "$ROOT_DIR/backend/storage/public"
}

start_detached() {
  local pid_file="$1"
  local log_file="$2"
  shift 2

  if command -v setsid >/dev/null 2>&1; then
    setsid "$@" </dev/null >> "$log_file" 2>&1 &
  else
    nohup "$@" </dev/null >> "$log_file" 2>&1 &
  fi
  echo "$!" > "$pid_file"
}

server_pids() {
  pgrep -f "[p]ython[^[:space:]]*[[:space:]].*$ROOT_DIR/server\\.py([[:space:]]|$)" || true
}

tunnel_pids() {
  pgrep -f "[c]loudflared .*--config $TUNNEL_CONFIG .*tunnel .*run" || true
}

system_tunnel_pids() {
  pgrep -f "[c]loudflared .*--config /etc/cloudflared/config\\.yml .*tunnel run" || true
}

build_frontend() {
  if [ "${PHOTOMAP_SKIP_FRONTEND_BUILD:-}" = "1" ]; then
    return
  fi

  echo "Buduję frontend PhotoMap dla tego samego hosta API."
  (
    cd "$ROOT_DIR/frontend" || exit
    VITE_API_BASE_URL="${VITE_API_BASE_URL:-}" npm run build
  )
}

start_server() {
  ensure_runtime_dirs

  if [ -f "$AUTOSTART_DISABLED_FILE" ]; then
    echo "Publiczny runtime PhotoMap nie startuje, bo autostart jest wyłączony:"
    echo "$AUTOSTART_DISABLED_FILE"
    echo "Włącz ponownie: make autostart-start"
    return 1
  fi

  local running
  running="$(server_pids)"
  if [ -n "$running" ]; then
    echo "Publiczny runtime PhotoMap już działa:"
    echo "$running"
    return
  fi

  fail_if_port_busy "PhotoMap runtime" "$SERVER_PORT"
  build_frontend

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] start server $SERVER_URL" >> "$SERVER_LOG"
  start_detached "$SERVER_PID_FILE" "$SERVER_LOG" "$PYTHON_BIN" "$ROOT_DIR/server.py"

  wait_server
}

stop_server() {
  ensure_runtime_dirs

  local pids
  pids="$(server_pids)"
  if [ -z "$pids" ]; then
    echo "Publiczny runtime PhotoMap: zatrzymany"
  else
    echo "Zatrzymuję publiczny runtime PhotoMap:"
    echo "$pids"
    for pid in $pids; do
      terminate_pid "$pid"
    done
  fi

  rm -f "$SERVER_PID_FILE"
}

wait_server() {
  local seconds="${SERVER_WAIT_SECONDS:-12}"
  local i=0
  while [ "$i" -lt "$seconds" ]; do
    if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "$SERVER_URL/health" >/dev/null 2>&1; then
      echo "Publiczny runtime PhotoMap: $SERVER_URL"
      return
    fi
    if [ -f "$SERVER_LOG" ] && grep -q "Address already in use\\|Missing frontend build\\|Traceback" "$SERVER_LOG"; then
      break
    fi
    i=$((i + 1))
    sleep 1
  done

  echo "Publiczny runtime PhotoMap nie odpowiedział w ciągu ${seconds}s. Ostatnie logi:"
  tail -n 80 "$SERVER_LOG" 2>/dev/null || true
  return 1
}

server_status() {
  ensure_runtime_dirs

  echo "Publiczny runtime PhotoMap:"
  server_pids || true
  echo
  show_port "PhotoMap runtime" "$SERVER_PORT"
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS --max-time 2 "$SERVER_URL/health" >/dev/null 2>&1; then
      echo "PhotoMap runtime health: OK"
    else
      echo "PhotoMap runtime health: brak odpowiedzi"
    fi
  fi
}

server_logs() {
  ensure_runtime_dirs
  tail -n "${DEV_LOG_LINES:-120}" "$SERVER_LOG" 2>/dev/null || echo "brak logów"
}

start_tunnel() {
  ensure_runtime_dirs

  if ! command -v cloudflared >/dev/null 2>&1; then
    echo "cloudflared nie jest dostępny w PATH."
    return 1
  fi
  if [ ! -f "$TUNNEL_CONFIG" ]; then
    echo "Brak konfiguracji tunelu: $TUNNEL_CONFIG"
    return 1
  fi

  local running
  running="$(tunnel_pids)"
  if [ -n "$running" ]; then
    echo "Cloudflare tunnel już działa:"
    echo "$running"
    return
  fi

  running="$(system_tunnel_pids)"
  if [ -n "$running" ]; then
    echo "Systemowy Cloudflare tunnel już działa:"
    echo "$running"
    return
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] start cloudflared $TUNNEL_CONFIG" >> "$TUNNEL_LOG"
  start_detached "$TUNNEL_PID_FILE" "$TUNNEL_LOG" cloudflared --config "$TUNNEL_CONFIG" tunnel run
  sleep 1

  local pid
  pid="$(pid_from_file "$TUNNEL_PID_FILE")"
  if is_running "$pid"; then
    echo "Cloudflare tunnel: działa, PID $pid"
  else
    echo "Cloudflare tunnel nie wystartował. Ostatnie logi:"
    tail -n 80 "$TUNNEL_LOG" 2>/dev/null || true
    return 1
  fi
}

stop_tunnel() {
  ensure_runtime_dirs

  local pids
  pids="$(tunnel_pids)"
  if [ -z "$pids" ]; then
    echo "Cloudflare tunnel: zatrzymany"
  else
    echo "Zatrzymuję Cloudflare tunnel:"
    echo "$pids"
    for pid in $pids; do
      terminate_pid "$pid"
    done
  fi

  rm -f "$TUNNEL_PID_FILE"
}

tunnel_status() {
  ensure_runtime_dirs

  echo "Cloudflare tunnel:"
  tunnel_pids || true
  local system_running
  system_running="$(system_tunnel_pids)"
  if [ -n "$system_running" ]; then
    echo "Systemowy Cloudflare tunnel:"
    echo "$system_running"
  fi
  if [ -f "$TUNNEL_CONFIG" ]; then
    echo "Config: $TUNNEL_CONFIG"
  else
    echo "Config: brak $TUNNEL_CONFIG"
  fi
}

tunnel_logs() {
  ensure_runtime_dirs
  tail -n "${DEV_LOG_LINES:-120}" "$TUNNEL_LOG" 2>/dev/null || echo "brak logów"
}

autostart_start() {
  rm -f "$AUTOSTART_DISABLED_FILE"
  start_server
  start_tunnel
}

autostart_stop() {
  ensure_runtime_dirs
  printf 'disabled\n' > "$AUTOSTART_DISABLED_FILE"
  stop_tunnel
  stop_server
  echo "Autostart PhotoMap wyłączony."
}

autostart_status() {
  if [ -f "$AUTOSTART_DISABLED_FILE" ]; then
    echo "Autostart PhotoMap: wyłączony"
    echo "Blokada: $AUTOSTART_DISABLED_FILE"
  else
    echo "Autostart PhotoMap: włączony"
  fi
  echo
  server_status
  echo
  tunnel_status
}

case "${1:-status}" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server
    echo
    start_server
    ;;
  status)
    server_status
    ;;
  logs)
    server_logs
    ;;
  tunnel-start)
    start_tunnel
    ;;
  tunnel-stop)
    stop_tunnel
    ;;
  tunnel-status)
    tunnel_status
    ;;
  tunnel-logs)
    tunnel_logs
    ;;
  autostart-start)
    autostart_start
    ;;
  autostart-stop)
    autostart_stop
    ;;
  autostart-status)
    autostart_status
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    usage
    exit 2
    ;;
esac
