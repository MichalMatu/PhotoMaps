from pathlib import Path

path = Path(__file__).resolve().parents[2] / "frontend/src/components/map/placeGalleryPreload.ts"
text = path.read_text(encoding="utf-8")
text = text.replace("export function galleryThumbPaths(", "function galleryThumbPaths(")
text = text.replace("export function preloadGalleryThumbPaths(", "function preloadGalleryThumbPaths(")
path.write_text(text, encoding="utf-8")
