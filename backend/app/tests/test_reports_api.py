from conftest import ADMIN_HEADERS, create_place


def test_public_report_can_be_created_and_closed_by_admin(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    create_response = client.post(
        "/api/reports",
        json={
            "target_type": "place",
            "target_id": place.id,
            "reason": "wrong_data",
            "message": "Adres jest nieaktualny.",
        },
    )
    report_id = create_response.json()["id"]

    list_response = client.get("/api/admin/reports", headers=ADMIN_HEADERS)
    close_response = client.patch(
        f"/api/admin/reports/{report_id}",
        headers=ADMIN_HEADERS,
        json={"status": "closed"},
    )

    assert create_response.status_code == 201
    assert create_response.json()["status"] == "open"
    assert list_response.status_code == 200
    assert list_response.json()[0]["id"] == report_id
    assert close_response.status_code == 200
    assert close_response.json()["status"] == "closed"


def test_report_rejects_unsupported_target_type(client_session) -> None:
    client, _session = client_session

    response = client.post(
        "/api/reports",
        json={"target_type": "unknown", "target_id": "x", "reason": "bad"},
    )

    assert response.status_code == 422


def test_report_rejects_missing_target(client_session) -> None:
    client, _session = client_session

    response = client.post(
        "/api/reports",
        json={"target_type": "place", "target_id": "missing-place", "reason": "wrong_data"},
    )

    assert response.status_code == 404
