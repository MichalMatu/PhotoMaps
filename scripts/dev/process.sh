# shellcheck shell=bash

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

  if [ "$label" = "Backend" ] && [[ "$command" == *"$ROOT_DIR/server.py"* ]]; then
    return 1
  fi
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
