#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="full"
S22_TARGET="${S22_HOST_ALIAS:-termux-phone}"
S22_TIMEOUT_SECONDS="${S22_TIMEOUT_SECONDS:-3600}"
REMOTE_URL="${PHOTOMAP_REMOTE_URL:-https://github.com/MichalMatu/PhotoMaps.git}"
RUN_MAC=1
RUN_S22=1

usage() {
  cat <<'EOF'
Usage: scripts/distributed_verify.sh [options]

Options:
  --profile full       Verification profile. V1 supports only: full
  --target NAME        host-ops SSH target alias (default: termux-phone)
  --mac-only           Run only the Mac lane
  --s22-only           Run only the S22/Termux lane
  -h, --help           Show this help

Environment:
  HOSTOPS_BIN          Explicit hostops executable path
  S22_HOST_ALIAS       Default SSH target alias
  S22_TIMEOUT_SECONDS  Whole host-ops SSH timeout (default: 3600)
  PHOTOMAP_REMOTE_URL  Git remote visible from the phone
EOF
}

while (($#)); do
  case "$1" in
    --profile)
      PROFILE="${2:-}"
      shift 2
      ;;
    --target)
      S22_TARGET="${2:-}"
      shift 2
      ;;
    --mac-only)
      RUN_S22=0
      shift
      ;;
    --s22-only)
      RUN_MAC=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$PROFILE" != "full" ]]; then
  echo "Unsupported profile: $PROFILE" >&2
  exit 2
fi
if ((RUN_MAC == 0 && RUN_S22 == 0)); then
  echo "No verification lane selected." >&2
  exit 2
fi
if ! [[ "$S22_TIMEOUT_SECONDS" =~ ^[0-9]+$ ]] || ((S22_TIMEOUT_SECONDS < 60)); then
  echo "S22_TIMEOUT_SECONDS must be an integer >= 60." >&2
  exit 2
fi

cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Distributed verification requires a clean Git checkout." >&2
  echo "Commit or stash changes first so Mac and S22 can verify one exact SHA." >&2
  exit 2
fi

SHA="$(git rev-parse --verify HEAD)"

# The phone can only reproduce commits that are reachable from origin.
git fetch --quiet origin
if ! git branch -r --contains "$SHA" | grep -q '[^[:space:]]'; then
  echo "HEAD $SHA is not reachable from a fetched origin ref." >&2
  echo "Push the candidate branch before distributed verification." >&2
  exit 2
fi

resolve_hostops() {
  if [[ -n "${HOSTOPS_BIN:-}" ]]; then
    printf '%s\n' "$HOSTOPS_BIN"
    return
  fi
  if command -v hostops >/dev/null 2>&1; then
    command -v hostops
    return
  fi
  local candidate
  for candidate in \
    "$HOME/agent-workspace/repos/host-ops/work/.venv/bin/hostops" \
    "$HOME/host-ops/.venv/bin/hostops" \
    "$HOME/Documents/host-ops/.venv/bin/hostops" \
    "$HOME/Documents/GitHub/host-ops/.venv/bin/hostops"
  do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return
    fi
  done
  return 1
}

HOSTOPS=""
if ((RUN_S22)); then
  if ! HOSTOPS="$(resolve_hostops)"; then
    echo "hostops executable not found. Set HOSTOPS_BIN explicitly." >&2
    exit 2
  fi
  echo "Checking S22 transport via host-ops target '$S22_TARGET'..."
  "$HOSTOPS" ssh check "$S22_TARGET" --timeout 20
fi

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
LOG_DIR="$ROOT_DIR/.dev/distributed-verify/$RUN_ID"
mkdir -p "$LOG_DIR"

mac_pid=""
s22_pid=""

cleanup() {
  local pid
  for pid in "$mac_pid" "$s22_pid"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup INT TERM

if ((RUN_MAC)); then
  (
    exec bash "$ROOT_DIR/scripts/distributed/mac_verify.sh" "$SHA" "$PROFILE"
  ) >"$LOG_DIR/mac.log" 2>&1 &
  mac_pid=$!
  echo "Mac lane started (pid=$mac_pid)."
fi

if ((RUN_S22)); then
  read -r -d '' REMOTE_BOOTSTRAP <<'REMOTE' || true
set -euo pipefail
repo_url="$1"
sha="$2"
cache_root="$HOME/.cache/photomap-distributed-v1"
repo_dir="$cache_root/repo"
lock_file="$HOME/.cache/local-agent-s22-worker.lock"
mkdir -p "$cache_root"

if ! command -v flock >/dev/null 2>&1; then
  echo "S22 worker requires 'flock' (Termux package: util-linux)." >&2
  exit 4
fi
exec 9>"$lock_file"
if ! flock -n 9; then
  echo "S22 worker is busy with another distributed job." >&2
  exit 75
fi

if [[ ! -d "$repo_dir/.git" ]]; then
  git clone --no-checkout "$repo_url" "$repo_dir"
fi

git -C "$repo_dir" remote set-url origin "$repo_url"
git -C "$repo_dir" reset --hard >/dev/null 2>&1 || true
git -C "$repo_dir" clean -fd >/dev/null 2>&1 || true
git -C "$repo_dir" fetch --prune origin
git -C "$repo_dir" cat-file -e "${sha}^{commit}"
git -C "$repo_dir" checkout --detach "$sha"
git -C "$repo_dir" reset --hard "$sha"

actual="$(git -C "$repo_dir" rev-parse HEAD)"
if [[ "$actual" != "$sha" ]]; then
  echo "Remote SHA mismatch: expected=$sha actual=$actual" >&2
  exit 3
fi

bash "$repo_dir/scripts/remote/s22_verify.sh" "$sha" full
REMOTE

  (
    exec "$HOSTOPS" ssh exec "$S22_TARGET" --timeout "$S22_TIMEOUT_SECONDS" -- \
      bash -lc "$REMOTE_BOOTSTRAP" _ "$REMOTE_URL" "$SHA"
  ) >"$LOG_DIR/s22.log" 2>&1 &
  s22_pid=$!
  echo "S22 lane started (pid=$s22_pid)."
fi

# host-ops emits the captured remote output after command completion. Keep the
# parent task visibly alive while either lane is still working.
while true; do
  mac_alive=0
  s22_alive=0
  [[ -n "$mac_pid" ]] && kill -0 "$mac_pid" 2>/dev/null && mac_alive=1
  [[ -n "$s22_pid" ]] && kill -0 "$s22_pid" 2>/dev/null && s22_alive=1
  if ((mac_alive == 0 && s22_alive == 0)); then
    break
  fi
  echo "distributed-verify heartbeat: sha=${SHA:0:12} mac=$mac_alive s22=$s22_alive"
  sleep 30
done

mac_status=0
s22_status=0
if [[ -n "$mac_pid" ]]; then
  wait "$mac_pid" || mac_status=$?
fi
if [[ -n "$s22_pid" ]]; then
  wait "$s22_pid" || s22_status=$?
fi

printf '\nDistributed verification result for %s\n' "$SHA"
printf '  Mac: %s\n' "$([[ $mac_status -eq 0 ]] && echo PASS || echo "FAIL ($mac_status)")"
printf '  S22: %s\n' "$([[ $s22_status -eq 0 ]] && echo PASS || echo "FAIL ($s22_status)")"
printf '  Logs: %s\n' "$LOG_DIR"

if ((mac_status != 0)); then
  printf '\n--- Mac failure tail ---\n' >&2
  tail -n 80 "$LOG_DIR/mac.log" >&2 || true
fi
if ((s22_status != 0)); then
  printf '\n--- S22 failure tail ---\n' >&2
  tail -n 80 "$LOG_DIR/s22.log" >&2 || true
fi

if ((mac_status != 0 || s22_status != 0)); then
  exit 1
fi

echo "Distributed verification PASS."
