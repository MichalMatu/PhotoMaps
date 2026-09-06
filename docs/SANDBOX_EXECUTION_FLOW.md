# PhotoMap Sandbox-First Execution Flow

Status: **ACTIVE**

## Goal

Use the ChatGPT sandbox as the default software-only build/test worker, GitHub Actions as the canonical networked verifier and Local Agent only when a task genuinely needs the user's Mac or other local resources.

This flow exists to:

- run Python/TypeScript builds and tests without repeatedly consuming Mac CPU/RAM;
- make a fresh chat reproducible even when the sandbox has no reliable package-network access;
- persist bootstrap/cache artifacts in ChatGPT Library;
- keep GitHub `main` as the source of truth;
- verify the exact source SHA being edited/tested;
- reuse the repository's existing `make check` and `make quality` gates instead of creating a second test system.

## Worker roles

### ChatGPT sandbox — default software worker

Use for source inspection, patch preparation, Python tests, Ruff, migrations, TypeScript checks, ESLint, Vitest, Vite builds and Playwright Chromium tests after the compatible offline dependency pack has been restored.

The baseline this flow targets is:

- Debian x86_64;
- Python 3.13;
- Node.js 22;
- npm 10+;
- no assumption of direct shell internet access.

The repository's canonical CI remains Python 3.12 + Node 22. The sandbox Python 3.13 lane is an additional compatibility/test worker, not a replacement for CI.

### GitHub Actions — canonical networked worker

Use for:

- dependency downloads;
- generation of exact source snapshots;
- generation of the offline Python/npm/Playwright pack;
- the existing `make quality` CI gate on the exact pushed SHA.

### Local Agent — machine-specific worker

Use Local Agent when the task needs the user's local filesystem, machine services, locally held data, production-like runtime state or other evidence that cannot be reproduced safely in the sandbox/CI.

Routine Python/React edits and test runs should prefer sandbox/CI.

## Persistent ChatGPT Library layout

Use the persistent Library folder:

`/PhotoMaps/Sandbox/`

Store source snapshots as:

- `photomap-source-<git-sha>.tar.zst`
- `photomap-source-<git-sha>.tar.zst.sha256`

Store offline dependency packs under a dependency-key folder, for example:

- `photomap-offline-<dependency-key>/manifest/full-pack.name`
- `photomap-offline-<dependency-key>/manifest/full-pack.sha256`
- `photomap-offline-<dependency-key>/manifest/parts.sha256`
- `photomap-offline-<dependency-key>/part-00` ... `part-N`

Do not place secrets, tokens, production databases, private media, cookies or local `.env` files in these packs.

## What the offline pack contains

The generated pack contains only reusable development dependencies:

- Python wheelhouse built for CPython 3.13 x86_64;
- npm package cache for `frontend/package-lock.json`;
- Playwright Chromium browser binaries;
- metadata with the exact dependency key and input hashes.

It intentionally does not contain application data or a prebuilt virtual environment. A fresh sandbox creates its own venv and `node_modules` from the offline caches.

## Dependency key

The dependency key changes when any of these inputs change:

- `backend/requirements.txt`;
- `backend/pyproject.toml`;
- `frontend/package.json`;
- `frontend/package-lock.json`;
- sandbox bootstrap/run scripts;
- sandbox Python major/minor (3.13);
- Node major (22).

Source-only application changes do not invalidate the offline dependency pack.

## Fresh sandbox bootstrap

1. Read `AGENTS.md`, `README.md` and this file.
2. Determine the exact target Git SHA from GitHub.
3. Find the matching `photomap-source-<sha>.tar.zst` in `/PhotoMaps/Sandbox/` or download the matching GitHub Actions artifact.
4. Verify its SHA-256 before extraction.
5. Extract the snapshot, for example:

   ```bash
   mkdir -p /mnt/data/photomap-source
   tar --zstd -xf photomap-source-<sha>.tar.zst -C /mnt/data/photomap-source
   ```

6. Read `.sandbox-snapshot/git-sha.txt` inside the extracted source and confirm it exactly matches the intended SHA.
7. Find the current compatible offline dependency pack in `/PhotoMaps/Sandbox/`.
8. If the pack is split, verify every part using `parts.sha256`, concatenate parts in order, verify `full-pack.sha256`, then extract it.
9. Bootstrap the environment from the repository root:

   ```bash
   tools/sandbox/bootstrap-sandbox.sh \
     /mnt/data/photomap-sandbox \
     /mnt/data/photomap-offline
   source /mnt/data/photomap-sandbox/env.sh
   tools/sandbox/sandbox-doctor.sh
   ```

10. Run the narrowest useful gate first, then broaden if it passes.

Never silently test a source snapshot whose embedded SHA differs from the requested source revision.

## Running tests

The wrapper understands these profiles:

```bash
tools/sandbox/run-sandbox-check.sh backend
tools/sandbox/run-sandbox-check.sh frontend
tools/sandbox/run-sandbox-check.sh check
tools/sandbox/run-sandbox-check.sh quality
```

Profiles:

- `backend` — Alembic upgrade, Ruff format/check, pytest and compileall;
- `frontend` — formatting, lint/typecheck, Knip, Vitest and Vite build;
- `check` — repository `make check`, including the current focused Playwright visual smoke;
- `quality` — repository `make quality`, the broad local gate.

For a very narrow test, use the environment directly, for example:

```bash
source /mnt/data/photomap-sandbox/env.sh
cd backend
python -m pytest app/tests/test_some_contract.py -q
```

or:

```bash
source /mnt/data/photomap-sandbox/env.sh
cd frontend
npm run test -- src/some-helper.test.ts
```

## Verification ladder

Prefer the cheapest useful evidence first:

1. changed-file/static inspection;
2. one affected backend/frontend test;
3. `run-sandbox-check.sh backend` or `frontend`;
4. `run-sandbox-check.sh check`;
5. `run-sandbox-check.sh quality`;
6. exact-SHA GitHub Actions result;
7. Local Agent only for machine-specific evidence.

A sandbox pass does not replace canonical CI when a change is intended for `main`; CI validates the repository in its supported Python 3.12 environment.

## GitHub Actions pack generation

`.github/workflows/sandbox-pack.yml` always creates an exact source snapshot for matching pushes.

The larger offline dependency pack is generated only when explicitly requested:

- workflow dispatch with `include_offline_dependencies=true`; or
- a pushed commit whose message contains `[sandbox-offline]`.

The offline archive is split into transport-sized parts so it can be moved into ChatGPT Library without one oversized artifact.

When dependency inputs change, generate a new pack instead of modifying an old dependency-key folder in place.

## Source-of-truth policy

- GitHub source branch/commit is canonical.
- Library source snapshots are transport/cache artifacts only.
- Library dependency packs are reproducible build caches only.
- Local Agent output is machine evidence, not the source repository.
- Never commit generated venvs, `node_modules`, browser caches or Library bundles to Git.
