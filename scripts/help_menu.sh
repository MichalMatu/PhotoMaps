#!/usr/bin/env bash
set -euo pipefail

MAKE_BIN="${MAKE:-make}"
MENU_CHOICE=""
PROMPT_VALUE=""

clear_screen() {
  if [ -t 1 ] && [ -n "${TERM:-}" ] && command -v clear >/dev/null 2>&1; then
    clear
  fi
}

read_choice() {
  local prompt="$1"
  MENU_CHOICE=""
  printf '\n%s' "$prompt"
  IFS= read -r MENU_CHOICE || return 1
}

read_value() {
  local prompt="$1"
  local default="${2:-}"
  PROMPT_VALUE=""
  if [ -n "$default" ]; then
    printf '%s [%s]: ' "$prompt" "$default"
  else
    printf '%s: ' "$prompt"
  fi
  IFS= read -r PROMPT_VALUE || return 1
  if [ -z "$PROMPT_VALUE" ]; then
    PROMPT_VALUE="$default"
  fi
}

confirm_exact() {
  local message="$1"
  local answer
  printf '%s\n' "$message"
  printf '%s' 'Wpisz "tak", żeby kontynuować: '
  IFS= read -r answer || return 1
  [ "$answer" = "tak" ]
}

run_make() {
  printf '\nUruchamiam: make'
  printf ' %q' "$@"
  printf '\n\n'
  "$MAKE_BIN" "$@"
}

run_with_manifest() {
  local target="$1"
  local mode_label="$2"
  local manifest
  read_value "Ścieżka manifestu dla ${mode_label}" "content/cities/wroclaw/manifest.json" || return 0
  manifest="$PROMPT_VALUE"
  run_make "$target" "MANIFEST=$manifest"
}

run_export_place() {
  local query
  read_value "Miasto albo miejsce do eksportu (puste = skrypt zapyta)" "" || return 0
  query="$PROMPT_VALUE"
  if [ -n "$query" ]; then
    run_make export-place-research "QUERY=$query"
  else
    run_make export-place-research
  fi
}

run_export_city() {
  local city
  read_value "Miasto do eksportu (puste = skrypt zapyta)" "" || return 0
  city="$PROMPT_VALUE"
  if [ -n "$city" ]; then
    run_make export-city-research "CITY=$city"
  else
    run_make export-city-research
  fi
}

run_export_all() {
  if confirm_exact "To utworzy tekstowe paczki research dla wszystkich miejsc w bazie."; then
    run_make export-all-research "ARGS=--yes"
  else
    printf '\nEksport przerwany.\n'
  fi
}

run_redact_media() {
  local args
  printf '%s\n' 'Przykład: --dry-run --kind photo --id <id> --rect 0.1,0.1,0.4,0.3'
  read_value "ARGS dla redact-media" "" || return 0
  args="$PROMPT_VALUE"
  if [ -z "$args" ]; then
    printf '\nBrak ARGS, komenda przerwana.\n'
    return 1
  fi
  run_make redact-media "ARGS=$args"
}

run_action() {
  local action="$1"

  case "$action" in
    export-place-research)
      run_export_place
      ;;
    export-city-research)
      run_export_city
      ;;
    export-all-research)
      run_export_all
      ;;
    import-city)
      run_with_manifest import-city "walidacji"
      ;;
    import-city-apply)
      if confirm_exact "To zapisze dane z manifestu do lokalnej bazy."; then
        run_with_manifest import-city-apply "importu"
      else
        printf '\nImport przerwany.\n'
      fi
      ;;
    backup-apply)
      if confirm_exact "To utworzy realny backup lokalnej bazy i storage."; then
        run_make backup-apply
      else
        printf '\nBackup przerwany.\n'
      fi
      ;;
    cleanup-media-apply)
      if confirm_exact "To usunie osierocone pliki mediów wskazane przez diagnostykę."; then
        run_make cleanup-media-apply
      else
        printf '\nCzyszczenie przerwane.\n'
      fi
      ;;
    retain-originals-apply)
      if confirm_exact "To zastosuje retencję prywatnych oryginałów w storage."; then
        run_make retain-originals-apply
      else
        printf '\nRetencja przerwana.\n'
      fi
      ;;
    reset-dev-data)
      if confirm_exact "To usunie lokalną bazę dev i storage dev."; then
        run_make reset-dev-data
      else
        printf '\nReset przerwany.\n'
      fi
      ;;
    redact-media)
      run_redact_media
      ;;
    server-start|server-stop|server-restart|tunnel-start|tunnel-stop|autostart-start|autostart-stop)
      if confirm_exact "To zmieni stan publicznego runtime/tunelu."; then
        run_make "$action"
      else
        printf '\nOperacja przerwana.\n'
      fi
      ;;
    *)
      run_make "$action"
      ;;
  esac
}

show_category() {
  local title="$1"
  shift
  local commands=("$@")
  local index=1
  local choice
  local selected
  local action
  local label
  local description

  clear_screen
  printf '%s\n\n' "PhotoMap - ${title}"
  for entry in "${commands[@]}"; do
    IFS='|' read -r action label description <<<"$entry"
    printf '%2d. %-34s %s\n' "$index" "$label" "$description"
    index=$((index + 1))
  done
  printf '%2d. %s\n' 0 "Wyjście"

  read_choice "Wpisz numer komendy: " || return 0
  choice="$MENU_CHOICE"
  if [ "$choice" = "0" ] || [ -z "$choice" ]; then
    return 0
  fi
  if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "${#commands[@]}" ]; then
    printf '\n%s\n' "Nie ma takiej pozycji."
    return 1
  fi

  selected="${commands[$((choice - 1))]}"
  IFS='|' read -r action _ <<<"$selected"
  clear_screen
  run_action "$action"
}

show_main_menu() {
  local categories=(
    "Najczęściej używane"
    "Audyt i research opisów"
    "Content import"
    "Dev lokalny"
    "Diagnostyka i testy"
    "Backup i storage"
    "Publiczny runtime i tunnel"
    "Zaawansowane / ryzykowne"
    "Dokumentacja skryptów"
  )
  local index=1
  local choice

  clear_screen
  printf '%s\n\n' "PhotoMap - wybierz kategorię"
  for category in "${categories[@]}"; do
    printf '%2d. %s\n' "$index" "$category"
    index=$((index + 1))
  done
  printf '%2d. %s\n' 0 "Wyjście"

  read_choice "Wpisz numer kategorii: " || return 0
  choice="$MENU_CHOICE"
  if [ "$choice" = "0" ] || [ -z "$choice" ]; then
    return 0
  fi
  if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "${#categories[@]}" ]; then
    printf '\n%s\n' "Nie ma takiej kategorii."
    return 1
  fi

  case "$choice" in
    1)
      show_category "Najczęściej używane" \
        "start|make start|Uruchom lokalny backend i frontend." \
        "status|make status|Pokaż PID-y, porty i health dev." \
        "logs|make logs|Pokaż ostatnie logi dev." \
        "stop|make stop|Zatrzymaj lokalny dev." \
        "check|make check|Uruchom pełny check projektu." \
        "diagnose-data|make diagnose-data|Sprawdź lokalną bazę i storage." \
        "backup|make backup|Sprawdź plan backupu bez kopiowania." \
        "audit-prompt|make audit-prompt|Wygeneruj prompt audytu opisów z publicznego API." \
        "place-inventory|make place-inventory|Utwórz JSON miast i miejsc dla AI." \
        "export-place-research|make export-place-research|Utwórz research ZIP dla jednego miejsca." \
        "export-city-research|make export-city-research|Utwórz jedną paczkę research ZIP dla miasta." \
        "scripts|make scripts|Pokaż statyczny spis skrótów."
      ;;
    2)
      show_category "Audyt i research opisów" \
        "audit-prompt|make audit-prompt|Generator promptu do audytu opisów przez web chat." \
        "place-inventory|make place-inventory|JSON z miastami i miejscami do szukania braków." \
        "export-place-research|make export-place-research|Eksport opisów jednego miejsca do ZIP." \
        "export-city-research|make export-city-research|Eksport miasta do jednej paczki ZIP." \
        "export-all-research|make export-all-research|Eksport całej bazy do jednej paczki ZIP."
      ;;
    3)
      show_category "Content import" \
        "import-city|make import-city|Waliduj manifest miasta bez zmian w bazie." \
        "import-city-apply|make import-city-apply|Zapisz manifest miasta do lokalnej bazy."
      ;;
    4)
      show_category "Dev lokalny" \
        "start|make start|Uruchom backend i frontend." \
        "stop|make stop|Zatrzymaj lokalny backend i frontend." \
        "restart|make restart|Restart lokalnego dev." \
        "status|make status|Pokaż PID-y, porty i stan usług." \
        "logs|make logs|Pokaż ostatnie logi backendu i frontendu."
      ;;
    5)
      show_category "Diagnostyka i testy" \
        "check|make check|Pełny check projektu." \
        "schema-check|make schema-check|Sprawdź zgodność schematu bazy z modelami." \
        "diagnose-data|make diagnose-data|Sprawdź lokalną bazę i storage." \
        "diagnose-architecture|make diagnose-architecture|Pokaż raport architektury repo." \
        "api-contract|make api-contract|Sprawdź kontrakt publicznego API." \
        "api-flow|make api-flow|Sprawdź pełny flow produktu przez backend API." \
        "smoke|make smoke|Szybki smoke test backendu i frontendu." \
        "perf-smoke|make perf-smoke|Podstawowy test wydajności endpointów." \
        "e2e|make e2e|Testy E2E w Chromium." \
        "quality|make quality|Zestaw jakościowy bez pełnego check.sh."
      ;;
    6)
      show_category "Backup i storage" \
        "backup|make backup|Dry-run backupu lokalnych danych." \
        "backup-apply|make backup-apply|Utwórz realny backup lokalnych danych." \
        "cleanup-media|make cleanup-media|Pokaż osierocone pliki mediów bez usuwania." \
        "cleanup-media-apply|make cleanup-media-apply|Usuń osierocone pliki po diagnostyce." \
        "retain-originals|make retain-originals|Dry-run retencji prywatnych oryginałów." \
        "retain-originals-apply|make retain-originals-apply|Zastosuj retencję prywatnych oryginałów."
      ;;
    7)
      show_category "Publiczny runtime i tunnel" \
        "server-status|make server-status|Pokaż PID, port i health publicznego runtime." \
        "server-logs|make server-logs|Pokaż logi publicznego runtime." \
        "server-start|make server-start|Zbuduj frontend i uruchom runtime." \
        "server-stop|make server-stop|Zatrzymaj publiczny runtime." \
        "server-restart|make server-restart|Restart publicznego runtime." \
        "tunnel-status|make tunnel-status|Pokaż status Cloudflare tunnel." \
        "tunnel-logs|make tunnel-logs|Pokaż logi Cloudflare tunnel." \
        "tunnel-start|make tunnel-start|Uruchom lokalny Cloudflare tunnel." \
        "tunnel-stop|make tunnel-stop|Zatrzymaj lokalny Cloudflare tunnel." \
        "autostart-status|make autostart|Pokaż status autostartu." \
        "autostart-start|make autostart-start|Włącz autostart, runtime i tunnel." \
        "autostart-stop|make autostart-stop|Wyłącz autostart i zatrzymaj runtime oraz tunnel."
      ;;
    8)
      show_category "Zaawansowane / ryzykowne" \
        "reset-dev-data|make reset-dev-data|Usuń lokalną bazę dev i storage dev." \
        "redact-media|make redact-media|Ręczna redakcja mediów, wymaga ARGS." \
        "scripts-readme|make scripts-readme|Wyświetl pełny opis scripts/README.md."
      ;;
    9)
      show_category "Dokumentacja skryptów" \
        "scripts|make scripts|Krótki statyczny spis skrótów." \
        "scripts-readme|make scripts-readme|Pełny opis scripts/README.md."
      ;;
  esac
}

show_main_menu
