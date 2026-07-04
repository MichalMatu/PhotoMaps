# shellcheck shell=bash

ensure_dirs() {
  mkdir -p \
    "$DEV_DIR" \
    "$ROOT_DIR/backend/data" \
    "$ROOT_DIR/backend/storage/private" \
    "$ROOT_DIR/backend/storage/public"
}

run_migrations() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] alembic upgrade head" >> "$BACKEND_LOG"
  (
    cd "$ROOT_DIR/backend" || exit
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
    cd "$ROOT_DIR/backend" || exit
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
    cd "$ROOT_DIR/frontend" || exit
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
