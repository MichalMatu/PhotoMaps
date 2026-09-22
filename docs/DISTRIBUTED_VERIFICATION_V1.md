# Distributed verification V1

Status: experimental development flow on `dev/distributed-verify-v1`. It is intentionally not wired into `main`, `make check`, `make quality`, or GitHub Actions.

## Goal

Allow one Local Agent task to verify the same exact PhotoMaps commit on two machines at the same time:

```text
ChatGPT planner
      |
      v
Local Agent on Mac
      |
      v
scripts/distributed_verify.sh
      |-----------------------------|
      v                             v
Mac lane                     host-ops SSH
static/contracts/              S22+ Termux lane
integration/E2E/perf          backend tests + frontend unit/build
      |                             |
      |------------- result --------|
```

Local Agent remains the only task owner. `host-ops` is only the deterministic SSH transport to the phone; the S22 does not run another Local Agent.

## Safety boundary

V1 is additive. Existing verification entrypoints are unchanged:

- `scripts/check.sh` is unchanged;
- `make check` is unchanged;
- `make quality` is unchanged;
- CI is unchanged;
- application/backend/frontend runtime code is unchanged.

The remote checkout lives only at:

```text
$HOME/.cache/photomap-distributed-v1/repo
```

It is a dedicated disposable build checkout. The bootstrap may reset and clean this path; it never targets a normal interactive checkout on the phone.

The S22 job also takes a non-blocking kernel lock at:

```text
$HOME/.cache/local-agent-s22-worker.lock
```

The lock is held by `flock`, so it is released automatically when the SSH process exits or dies. A second distributed job fails as busy instead of running another CPU-heavy build concurrently. Future projects such as WreckScanner should reuse this same lock name in the V1 model.

## Exact-SHA contract

Distributed verification refuses a dirty Mac checkout. It resolves `HEAD`, fetches `origin`, and requires that the commit is reachable from an origin ref before starting either lane.

The S22 worker then:

1. clones/fetches the public PhotoMaps remote into its dedicated cache checkout;
2. verifies that the requested SHA exists;
3. checks out that SHA detached;
4. verifies `git rev-parse HEAD` equals the requested SHA;
5. only then runs the S22 verification lane.

This prevents the Mac and phone from silently testing different source revisions.

## Lane split

### S22 / Termux

The phone receives CPU-heavy cross-platform work:

- isolated Alembic migration;
- backend pytest except the contract suite;
- coverage report;
- Python compileall;
- frontend Vitest suite;
- frontend production build;
- frontend bundle contract check.

The phone uses `backend/requirements-s22-v1.txt` instead of the complete development requirements. This intentionally avoids requiring Ruff/Schemathesis/browser tooling on Android in V1.

The Python venv lives under ignored `.dev/` state and survives exact-SHA checkout refreshes. `npm ci` intentionally recreates `node_modules` on every run, while npm’s package-manager cache remains reusable outside the disposable checkout.

### Mac

The Mac keeps checks that are already proven in the established host environment or are browser/performance oriented:

- Ruff format/check;
- schema and CSS token gates;
- frontend formatting, lint/typecheck and knip;
- API contract tests;
- smoke tests;
- performance smoke;
- complete Playwright E2E;
- shellcheck when installed.

The two lanes run concurrently.

## Running manually

Prerequisites on the Mac:

- clean PhotoMaps checkout at a commit pushed to GitHub;
- working `host-ops` SSH target for the S22;
- existing Mac project dependencies.

Prerequisites on S22 Termux:

- Git;
- Bash;
- `flock` from the Termux `util-linux` package;
- Python with `venv` support;
- Node.js/npm;
- normal native prerequisites required by PhotoMaps Python packages.

Run both lanes:

```bash
bash scripts/distributed_verify.sh --profile full --target termux-phone
```

Run only one lane while developing the flow:

```bash
bash scripts/distributed_verify.sh --mac-only
bash scripts/distributed_verify.sh --s22-only --target termux-phone
```

If `hostops` is not on PATH, the runner also checks the normal Local Agent `host-ops` worktree and a few standalone checkout locations. It can always be pinned explicitly:

```bash
HOSTOPS_BIN="$HOME/agent-workspace/repos/host-ops/work/.venv/bin/hostops" \
  bash scripts/distributed_verify.sh --target termux-phone
```

The target alias can also be supplied through `S22_HOST_ALIAS`. The default is `termux-phone`.

## Planner contract

When work is explicitly being done on `dev/distributed-verify-v1` and the user asks for wording such as:

- `testuj na Mac + S22`;
- `kompiluj i testuj używając Maca i telefonu`;
- `distributed verify`;

prefer one PhotoMaps Local Agent verification command:

```bash
bash scripts/distributed_verify.sh --profile full --target termux-phone
```

Do not split this into two Local Agent repository tasks. The script is the V1 coordinator and returns one terminal status after both lanes finish.

The first phone bootstrap can be much longer than the normal Local Agent command timeout. A Local Agent task that runs the combined flow should therefore reserve a bounded long command/task budget while keeping the normal 30-second runner heartbeat below the idle timeout. Recommended V1 task fields are:

```json
{
  "work_branch": "dev/distributed-verify-v1",
  "allow_write": false,
  "agent_binding": "2e5d59f8-f6e4-4d75-8d1a-dce7b6bf6607",
  "resources": [],
  "command_timeout": 4200,
  "idle_timeout": 300,
  "task_timeout": 4800,
  "memory_limit_mb": 4096
}
```

For V1 keep the existing PhotoMaps Local Agent task resource contract unchanged (`resources: []`). Cross-host scheduling is not added to Local Agent in this branch. The phone itself serializes V1 jobs with the shared `local-agent-s22-worker.lock`. A future generalized multi-host implementation may promote that ownership into a canonical named Local Agent resource after separate review.

The V1 runner intentionally verifies only a clean commit reachable from GitHub. It is therefore a candidate-SHA verification step, not a mechanism for shipping an uncommitted Local Agent workspace to the phone. A later version can add a bounded source-transfer capability if pre-push distributed verification is required.

## Logs and failure behavior

Each run writes local lane logs under:

```text
.dev/distributed-verify/<UTC timestamp>-<pid>/
```

The coordinator emits a heartbeat every 30 seconds while work is active so Local Agent does not see a long silent SSH operation. At completion it reports separate Mac and S22 PASS/FAIL state and prints a bounded failure tail for a failed lane.

A failure in either lane fails the whole distributed verification command.


## Validation checkpoint

On 2026-09-22 the Local Agent task `20260922-photomap-distributed-v1-final-audit-9c17` validated runner code SHA `ae03e5ebb3dd0b232004a13bdf2a63a529cb198b`. The checks passed for Bash syntax/help, ShellCheck, `host-ops` SSH identity, visibility of the exact dev SHA from the S22, real `python3 -m venv`/pip creation on Termux, Node/npm, and `flock`.

The closeout changes after that checkpoint are documentation-only; the three runner scripts remain unchanged from the validated SHA. A complete CPU-heavy Mac+S22 distributed verification run has not yet been executed. That live full run is the next step when development on this branch resumes, not a prerequisite for keeping the isolated prototype parked safely.

## V1 limitations

- This branch is development-only and must not be merged to `main` without a separate review decision.
- First S22 execution can be slow because Python/npm dependencies must be populated.
- Android/Termux compatibility of every PhotoMaps dependency still needs live bench verification.
- Artifacts are not transferred back from S22 in V1; only command result/output is returned.
- Work is distributed only inside one PhotoMaps task. Local Agent itself is not a multi-host scheduler yet.
- WreckScanner is not wired into this implementation yet; it can reuse the pattern after PhotoMaps live validation.
