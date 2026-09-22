#!/usr/bin/env bash
set -euo pipefail

cd frontend
npm run test:e2e -- e2e/visual/map-polish-targeted.spec.ts
cd ..

rm frontend/e2e/visual/map-polish-targeted.spec.ts scripts/dev/run_map_polish_targeted_verify.sh
git add -A
git commit -m "Remove temporary map polish verification"
git push origin HEAD:work/map-polish-label-prefetch-audio-motion
