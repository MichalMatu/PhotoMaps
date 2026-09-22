from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

security_path = ROOT / "backend/app/core/security_headers.py"
security = security_path.read_text(encoding="utf-8")
security = security.replace(
    '''SECURITY_HEADERS = {\n    "Cross-Origin-Opener-Policy": "same-origin",\n    "Permissions-Policy": "camera=(), geolocation=(self), microphone=(), payment=(), usb=()",\n    "Referrer-Policy": "strict-origin-when-cross-origin",\n    "X-Content-Type-Options": "nosniff",\n    "X-Frame-Options": "DENY",\n}\n\n\ndef is_public_image_path(path: str) -> bool:\n    return path.startswith("/media/") or (\n        path.startswith("/api/places/") and "/photos/" in path and path.endswith("/media/image")\n    )\n''',
    '''SECURITY_HEADERS = {\n    "Cross-Origin-Opener-Policy": "same-origin",\n    "Permissions-Policy": "camera=(), geolocation=(self), microphone=(), payment=(), usb=()",\n    "Referrer-Policy": "strict-origin-when-cross-origin",\n    "X-Content-Type-Options": "nosniff",\n    "X-Frame-Options": "DENY",\n}\nPUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=86400"\nPUBLIC_IMAGE_REVALIDATE_CACHE_CONTROL = "public, max-age=0, must-revalidate"\n\n\ndef is_public_media_path(path: str) -> bool:\n    return path.startswith("/media/")\n\n\ndef is_public_photo_image_path(path: str) -> bool:\n    return path.startswith("/api/places/") and "/photos/" in path and path.endswith("/media/image")\n''',
)
security = security.replace(
    '''    elif is_public_image_path(request.url.path):\n        response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"\n        response.headers["CDN-Cache-Control"] = "no-store"\n        response.headers["Cloudflare-CDN-Cache-Control"] = "no-store"\n''',
    '''    elif is_public_media_path(request.url.path):\n        response.headers["Cache-Control"] = PUBLIC_MEDIA_CACHE_CONTROL\n        response.headers["CDN-Cache-Control"] = "no-store"\n        response.headers["Cloudflare-CDN-Cache-Control"] = "no-store"\n    elif is_public_photo_image_path(request.url.path):\n        response.headers["Cache-Control"] = PUBLIC_IMAGE_REVALIDATE_CACHE_CONTROL\n        response.headers["CDN-Cache-Control"] = "no-store"\n        response.headers["Cloudflare-CDN-Cache-Control"] = "no-store"\n''',
)
assert "is_public_image_path" not in security
assert 'PUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=86400"' in security
security_path.write_text(security, encoding="utf-8")

main_path = ROOT / "backend/app/main.py"
main = main_path.read_text(encoding="utf-8")
main = main.replace("from fastapi.middleware.cors import CORSMiddleware\n", "from fastapi.middleware.cors import CORSMiddleware\nfrom fastapi.staticfiles import StaticFiles\n")
main = main.replace("from app.db.session import create_db_and_tables\nfrom app.media_static import PublicMediaStaticFiles\n", "from app.db.session import create_db_and_tables\n")
main = main.replace(
    'app.mount("/media", PublicMediaStaticFiles(directory=PUBLIC_STORAGE_DIR, check_dir=False), name="media")',
    'app.mount("/media", StaticFiles(directory=PUBLIC_STORAGE_DIR, check_dir=False), name="media")',
)
assert "PublicMediaStaticFiles" not in main
main_path.write_text(main, encoding="utf-8")

(ROOT / "backend/app/media_static.py").unlink()
(ROOT / "backend/app/tests/services/test_media_static.py").unlink()

test_path = ROOT / "backend/app/tests/api/admin/test_security_headers.py"
test = test_path.read_text(encoding="utf-8")
test = test.replace(
    "from app.core.security_headers import SECURITY_HEADERS\n",
    "from app.core.security_headers import (\n    PUBLIC_IMAGE_REVALIDATE_CACHE_CONTROL,\n    PUBLIC_MEDIA_CACHE_CONTROL,\n    SECURITY_HEADERS,\n)\n",
)
test = test.replace(
    '''def assert_public_image_cache_policy(response) -> None:\n    assert response.headers["cache-control"] == "public, max-age=0, must-revalidate"\n    assert response.headers["cdn-cache-control"] == "no-store"\n    assert response.headers["cloudflare-cdn-cache-control"] == "no-store"\n\n\ndef test_public_media_is_not_stored_by_the_cdn(client_session) -> None:\n    client, _session = client_session\n\n    response = client.get("/media/missing.jpg")\n\n    assert response.status_code == 404\n    assert_public_image_cache_policy(response)\n\n\ndef test_public_photo_original_is_not_stored_by_the_cdn(client_session) -> None:\n    client, _session = client_session\n\n    response = client.get("/api/places/missing-place/photos/missing-photo/media/image")\n\n    assert response.status_code == 404\n    assert_public_image_cache_policy(response)\n''',
    '''def assert_cdn_no_store(response) -> None:\n    assert response.headers["cdn-cache-control"] == "no-store"\n    assert response.headers["cloudflare-cdn-cache-control"] == "no-store"\n\n\ndef test_public_media_uses_reusable_browser_cache_without_cdn_storage(client_session) -> None:\n    client, _session = client_session\n\n    response = client.get("/media/missing.jpg")\n\n    assert response.status_code == 404\n    assert response.headers["cache-control"] == PUBLIC_MEDIA_CACHE_CONTROL\n    assert_cdn_no_store(response)\n\n\ndef test_public_photo_original_revalidates_without_cdn_storage(client_session) -> None:\n    client, _session = client_session\n\n    response = client.get("/api/places/missing-place/photos/missing-photo/media/image")\n\n    assert response.status_code == 404\n    assert response.headers["cache-control"] == PUBLIC_IMAGE_REVALIDATE_CACHE_CONTROL\n    assert_cdn_no_store(response)\n''',
)
assert "assert_public_image_cache_policy" not in test
assert "PUBLIC_MEDIA_CACHE_CONTROL" in test
test_path.write_text(test, encoding="utf-8")
