import pytest

from app.main import app

EXPECTED_MUTATION_OPERATIONS = {
    ("DELETE", "/api/admin/categories/{category_id}"),
    ("DELETE", "/api/admin/guides/{guide_id}/places/{place_id}"),
    ("DELETE", "/api/admin/memories/{memory_id}"),
    ("DELETE", "/api/admin/photos/{photo_id}"),
    ("DELETE", "/api/admin/places/{place_id}"),
    ("DELETE", "/api/places/{place_id}/memories/{memory_id}"),
    ("PATCH", "/api/admin/categories/{category_id}"),
    ("PATCH", "/api/admin/guides/{guide_id}"),
    ("PATCH", "/api/admin/memories/{memory_id}"),
    ("PATCH", "/api/admin/photos/{photo_id}"),
    ("PATCH", "/api/admin/places/{place_id}"),
    ("PATCH", "/api/admin/reports/{report_id}"),
    ("PATCH", "/api/places/{place_id}/memories/{memory_id}"),
    ("POST", "/api/admin/categories"),
    ("POST", "/api/admin/guides"),
    ("POST", "/api/admin/guides/{guide_id}/places"),
    ("POST", "/api/admin/memories/{memory_id}/review"),
    ("POST", "/api/admin/photos/{photo_id}/cover"),
    ("POST", "/api/admin/photos/{photo_id}/review"),
    ("POST", "/api/admin/places"),
    ("POST", "/api/places/{place_id}/memories"),
    ("POST", "/api/places/{place_id}/memories/{memory_id}/claim"),
    ("POST", "/api/places/{place_id}/photos"),
    ("POST", "/api/reports"),
}

ADMIN_MUTATION_PATHS = sorted(
    (method, path) for method, path in EXPECTED_MUTATION_OPERATIONS if path.startswith("/api/admin")
)

PUBLIC_INVALID_MUTATION_REQUESTS = [
    ("POST", "/api/places/missing/photos", {}),
    ("POST", "/api/places/missing/memories", {}),
    ("POST", "/api/places/missing/memories/missing/claim", {"claim_token": ""}),
    ("PATCH", "/api/places/missing/memories/missing", {"claim_token": ""}),
    ("DELETE", "/api/places/missing/memories/missing", {"claim_token": ""}),
    ("POST", "/api/reports", {}),
]


def mutation_operations_from_openapi() -> set[tuple[str, str]]:
    schema = app.openapi()
    operations: set[tuple[str, str]] = set()
    for path, path_schema in schema["paths"].items():
        for method in path_schema:
            if method.upper() in {"DELETE", "PATCH", "POST"}:
                operations.add((method.upper(), path))
    return operations


def concrete_path(path: str) -> str:
    return (
        path.replace("{category_id}", "missing")
        .replace("{guide_id}", "missing")
        .replace("{memory_id}", "missing")
        .replace("{photo_id}", "missing")
        .replace("{place_id}", "missing")
        .replace("{report_id}", "missing")
    )


def test_openapi_mutation_inventory_is_explicit() -> None:
    assert mutation_operations_from_openapi() == EXPECTED_MUTATION_OPERATIONS


@pytest.mark.parametrize(("method", "path"), ADMIN_MUTATION_PATHS)
def test_admin_mutation_contract_requires_bearer_token(client_session, method: str, path: str) -> None:
    client, _session = client_session

    response = client.request(method, concrete_path(path), json={})

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid admin token"}


@pytest.mark.parametrize(("method", "path", "payload"), PUBLIC_INVALID_MUTATION_REQUESTS)
def test_public_mutation_contract_rejects_invalid_payload_without_server_error(
    client_session,
    method: str,
    path: str,
    payload: dict[str, str],
) -> None:
    client, _session = client_session

    response = client.request(method, path, json=payload)

    assert response.status_code in {404, 422}
