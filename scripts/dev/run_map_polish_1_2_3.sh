#!/usr/bin/env bash
set -euo pipefail

python3 scripts/dev/apply_map_polish_1_2_3.py
python3 scripts/dev/apply_map_polish_leaflet_fix.py
rm scripts/dev/apply_map_polish_1_2_3.py scripts/dev/apply_map_polish_leaflet_fix.py scripts/dev/run_map_polish_1_2_3.sh

cd frontend
npx prettier --write \
  src/components/map/PlaceMarker.tsx \
  src/components/map/PlaceLayer.tsx \
  src/components/map/mapHtml.ts \
  src/components/map/mapHtml.test.ts \
  src/components/map/mapAudioPlayback.ts \
  src/components/map/mapAudioPlayback.test.ts \
  src/components/map/placeGalleryQuery.ts \
  src/components/map/placeGalleryQuery.test.ts \
  src/components/map/usePlaceGalleryData.ts \
  src/components/map/photo-detail/PhotoDetailModal.tsx \
  src/components/map/photo-detail/PhotoDetailAudioControl.tsx \
  src/styles/map.css
npm run test -- src/components/map
npm run build
cd ..

make check
cd frontend
npm run test:e2e
cd ..

git diff --check
git status --short
git add -A
git commit -m "Polish map discovery and audio feedback"
git push origin HEAD:work/map-polish-label-prefetch-audio-motion
