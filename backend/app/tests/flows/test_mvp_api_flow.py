from conftest import ADMIN_HEADERS, image_upload


def assert_no_private_original_path(payload) -> None:
    if isinstance(payload, dict):
        assert "original_path" not in payload
        for value in payload.values():
            assert_no_private_original_path(value)
    elif isinstance(payload, list):
        for item in payload:
            assert_no_private_original_path(item)


def test_mvp_content_moderation_map_guide_and_report_flow(client_session) -> None:
    client, _session = client_session

    category_response = client.post(
        "/api/admin/categories",
        headers=ADMIN_HEADERS,
        json={
            "id": "coffee",
            "label": "Kawa",
            "description": "Miejsca z kawą",
            "icon": "coffee",
            "sort_order": 1,
            "status": "active",
        },
    )
    assert category_response.status_code == 201

    place_response = client.post(
        "/api/admin/places",
        headers=ADMIN_HEADERS,
        json={
            "city_id": "wroclaw",
            "slug": "mvp-cafe",
            "title": "MVP Cafe",
            "description": "Małe miejsce z charakterem",
            "local_comment": "Bez sieciówkowego klimatu",
            "category_ids": ["coffee"],
            "lat": 51.11,
            "lon": 17.03,
            "weight": 2,
            "status": "published",
        },
    )
    assert place_response.status_code == 201
    place = place_response.json()

    photo_response = client.post(
        f"/api/places/{place['id']}/photos",
        files={"file": image_upload("front.jpg")},
        data={"caption": "Front miejsca", "consent_confirmed": "true"},
    )
    memory_response = client.post(
        f"/api/places/{place['id']}/memories",
        files={"file": image_upload("memory.jpg")},
        data={
            "author_city": "Wrocław",
            "author_name": "Marta",
            "caption": "Byłam tutaj",
            "claim_token": "secret-token",
            "consent_confirmed": "true",
            "memory_text": "Dobre miejsce na przerwę.",
        },
    )
    assert photo_response.status_code == 201
    assert memory_response.status_code == 201
    assert photo_response.json()["status"] == "pending"
    assert memory_response.json()["status"] == "pending"
    assert client.get(f"/api/places/{place['id']}/photos").json() == []
    assert client.get(f"/api/places/{place['id']}/memories").json() == []

    photo_id = photo_response.json()["id"]
    memory_id = memory_response.json()["id"]
    approve_photo_response = client.post(
        f"/api/admin/photos/{photo_id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "approved"},
    )
    approve_memory_response = client.post(
        f"/api/admin/memories/{memory_id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "approved"},
    )
    assert approve_photo_response.status_code == 200
    assert approve_memory_response.status_code == 200

    map_response = client.get("/api/places/map")
    detail_response = client.get("/api/places/mvp-cafe")
    photos_response = client.get(f"/api/places/{place['id']}/photos")
    memories_response = client.get(f"/api/places/{place['id']}/memories")
    for response in (map_response, detail_response, photos_response, memories_response):
        assert response.status_code == 200
        assert_no_private_original_path(response.json())

    map_place = map_response.json()[0]
    assert map_place["slug"] == "mvp-cafe"
    assert map_place["photo_count"] == 1
    assert map_place["memory_count"] == 1
    assert map_place["cover_photo"]["id"] == photo_id
    assert map_place["preview_items"][1]["id"] == memory_id

    guide_response = client.post(
        "/api/admin/guides",
        headers=ADMIN_HEADERS,
        json={"slug": "weekend", "title": "Weekend", "description": "Krótka trasa", "status": "published"},
    )
    assert guide_response.status_code == 201
    guide_id = guide_response.json()["id"]
    add_place_response = client.post(
        f"/api/admin/guides/{guide_id}/places",
        headers=ADMIN_HEADERS,
        json={"place_id": place["id"], "sort_order": 1},
    )
    public_guide_response = client.get("/api/guides/weekend")
    assert add_place_response.status_code == 200
    assert public_guide_response.status_code == 200
    assert public_guide_response.json()["places"][0]["id"] == place["id"]

    report_response = client.post(
        "/api/reports",
        json={
            "target_id": place["id"],
            "target_type": "place",
            "reason": "wrong_data",
            "message": "Godziny wymagają sprawdzenia.",
        },
    )
    assert report_response.status_code == 201
    report_id = report_response.json()["id"]
    admin_reports_response = client.get("/api/admin/reports", headers=ADMIN_HEADERS)
    close_report_response = client.patch(
        f"/api/admin/reports/{report_id}",
        headers=ADMIN_HEADERS,
        json={"status": "closed"},
    )
    assert admin_reports_response.status_code == 200
    assert admin_reports_response.json()[0]["id"] == report_id
    assert close_report_response.status_code == 200
    assert close_report_response.json()["status"] == "closed"
