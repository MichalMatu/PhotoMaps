from app.tests.support import ADMIN_HEADERS, create_place


def test_app_config_exposes_product_runtime_configuration(client_session) -> None:
    client, _session = client_session

    response = client.get("/api/app-config")

    assert response.status_code == 200
    body = response.json()
    assert body["product_name"] == "PhotoMap"
    assert body["locale"] == "pl-PL"
    assert body["map"]["fallback_center"] != {"lat": 51.1079, "lon": 17.0385}
    assert body["map"]["fallback_zoom"] == 13
    assert [field["key"] for field in body["place_custom_fields"]] == [
        "opening_hours",
        "floor",
        "price",
        "booking_url",
        "accessibility",
        "contact",
    ]
    assert {field["type"] for field in body["place_custom_fields"]} >= {"text", "number", "url", "select"}


def test_admin_app_config_update_persists_and_public_endpoint_reads_it(client_session) -> None:
    client, _session = client_session
    payload = client.get("/api/admin/app-config", headers=ADMIN_HEADERS).json()
    payload["product_name"] = "MallMap"
    payload["labels"]["place"] = "lokal"
    payload["branding"]["primary_color"] = "#0f766e"
    payload["map"]["fallback_center"] = {"lat": 50.0, "lon": 20.0}
    payload["place_custom_fields"].append(
        {
            "key": "unit_number",
            "label": "Numer lokalu",
            "type": "text",
            "required": False,
            "public": True,
            "options": None,
            "sort_order": 70,
        }
    )

    response = client.put("/api/admin/app-config", headers=ADMIN_HEADERS, json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["product_name"] == "MallMap"
    assert body["labels"]["place"] == "lokal"
    assert body["branding"]["primary_color"] == "#0f766e"
    assert body["map"]["fallback_center"] == {"lat": 50.0, "lon": 20.0}
    assert [field["key"] for field in body["place_custom_fields"]][-1] == "unit_number"
    assert client.get("/api/app-config").json()["product_name"] == "MallMap"


def test_admin_app_config_rejects_existing_custom_field_type_change(client_session) -> None:
    client, session = client_session
    create_place(session, custom_fields={"opening_hours": "10-18"})
    payload = client.get("/api/admin/app-config", headers=ADMIN_HEADERS).json()
    payload["place_custom_fields"][0]["type"] = "number"

    response = client.put("/api/admin/app-config", headers=ADMIN_HEADERS, json=payload)

    assert response.status_code == 422
    assert "Cannot change type for existing custom field: opening_hours" in response.json()["detail"]


def test_admin_app_config_rejects_required_custom_field_when_existing_places_miss_value(client_session) -> None:
    client, session = client_session
    create_place(session, custom_fields={"opening_hours": "10-18"})
    payload = client.get("/api/admin/app-config", headers=ADMIN_HEADERS).json()
    floor_field = next(field for field in payload["place_custom_fields"] if field["key"] == "floor")
    floor_field["required"] = True

    response = client.put("/api/admin/app-config", headers=ADMIN_HEADERS, json=payload)

    assert response.status_code == 422
    assert "place[public-place].custom_fields.floor is required" in response.json()["detail"]


def test_admin_app_config_rejects_select_option_removal_used_by_existing_place(client_session) -> None:
    client, session = client_session
    create_place(session, custom_fields={"accessibility": "pełna"})
    payload = client.get("/api/admin/app-config", headers=ADMIN_HEADERS).json()
    accessibility_field = next(field for field in payload["place_custom_fields"] if field["key"] == "accessibility")
    accessibility_field["options"] = ["częściowa", "brak informacji"]

    response = client.put("/api/admin/app-config", headers=ADMIN_HEADERS, json=payload)

    assert response.status_code == 422
    assert (
        "place[public-place].custom_fields.accessibility must be one of the configured options"
        in response.json()["detail"]
    )


def test_admin_app_config_removes_deleted_custom_field_values_from_places(client_session) -> None:
    client, session = client_session
    place = create_place(session, custom_fields={"floor": "2", "opening_hours": "10-18"})
    payload = client.get("/api/admin/app-config", headers=ADMIN_HEADERS).json()
    payload["place_custom_fields"] = [field for field in payload["place_custom_fields"] if field["key"] != "floor"]

    response = client.put("/api/admin/app-config", headers=ADMIN_HEADERS, json=payload)

    assert response.status_code == 200
    session.refresh(place)
    assert place.custom_fields == {"opening_hours": "10-18"}
    assert "floor" not in {field["key"] for field in response.json()["place_custom_fields"]}


def test_admin_app_config_requires_admin_token(client_session) -> None:
    client, _session = client_session

    response = client.get("/api/admin/app-config")

    assert response.status_code == 401
