from datetime import UTC, datetime

from sqlmodel import select

from app.core import public_submission_security
from app.core.rate_limit import RateLimitPolicy
from app.models.city import City
from app.models.guide import Guide, PlaceGuide
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.report import Report
from app.schemas.report import MAX_REPORT_MESSAGE_LENGTH
from app.services.tokens import claim_token_hash
from app.tests.support import ADMIN_HEADERS, create_place


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


def test_public_report_message_has_bounded_contract(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    response = client.post(
        "/api/reports",
        json={
            "target_type": "place",
            "target_id": place.id,
            "reason": "wrong_data",
            "message": "x" * (MAX_REPORT_MESSAGE_LENGTH + 1),
        },
    )

    assert response.status_code == 422
    assert session.exec(select(Report)).all() == []


def test_public_report_rate_limit_cannot_be_bypassed_with_client_header(client_session, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    monkeypatch.setattr(
        public_submission_security,
        "PUBLIC_REPORT_RATE_LIMIT_POLICY",
        RateLimitPolicy(scope="test-report", requests=1, window_seconds=60),
    )
    payload = {
        "target_type": "place",
        "target_id": place.id,
        "reason": "wrong_data",
        "message": "Test",
    }

    first_response = client.post("/api/reports", headers={"CF-Connecting-IP": "203.0.113.1"}, json=payload)
    limited_response = client.post("/api/reports", headers={"CF-Connecting-IP": "203.0.113.2"}, json=payload)

    assert first_response.status_code == 201
    assert limited_response.status_code == 429
    assert limited_response.json()["detail"] == "Too many requests"
    assert limited_response.headers["retry-after"] == "60"


def test_admin_can_delete_report(client_session) -> None:
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

    delete_response = client.delete(f"/api/admin/reports/{report_id}", headers=ADMIN_HEADERS)
    list_response = client.get("/api/admin/reports", headers=ADMIN_HEADERS)

    assert create_response.status_code == 201
    assert delete_response.status_code == 204
    assert list_response.status_code == 200
    assert list_response.json() == []


def test_admin_report_list_applies_queue_limit(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    for index in range(3):
        session.add(
            Report(
                target_type="place",
                target_id=place.id,
                reason="wrong_data",
                message=f"Raport {index}",
                created_at=datetime(2026, 1, index + 1, tzinfo=UTC),
            )
        )
    session.commit()

    response = client.get("/api/admin/reports?limit=2", headers=ADMIN_HEADERS)
    next_response = client.get("/api/admin/reports?limit=2&offset=2", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert len(response.json()) == 2
    assert next_response.status_code == 200
    assert len(next_response.json()) == 1
    assert {report["id"] for report in response.json()}.isdisjoint({report["id"] for report in next_response.json()})


def test_admin_queue_limit_is_validated(client_session) -> None:
    client, _session = client_session

    response = client.get("/api/admin/reports?limit=201", headers=ADMIN_HEADERS)

    assert response.status_code == 422
    assert response.json()["request_id"] == response.headers["x-request-id"]


def test_report_rejects_unsupported_target_type(client_session) -> None:
    client, _session = client_session

    response = client.post(
        "/api/reports",
        json={"target_type": "unknown", "target_id": "x", "reason": "bad"},
    )

    assert response.status_code == 422


def test_report_rejects_unsupported_reason(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    response = client.post(
        "/api/reports",
        json={"target_type": "place", "target_id": place.id, "reason": "bad"},
    )

    assert response.status_code == 422


def test_report_rejects_missing_target(client_session) -> None:
    client, _session = client_session

    response = client.post(
        "/api/reports",
        json={"target_type": "place", "target_id": "missing-place", "reason": "wrong_data"},
    )

    assert response.status_code == 404


def test_public_report_rejects_non_public_place(client_session) -> None:
    client, session = client_session
    session.add(City(id="archived-city", name="Archived", lat=50.06, lon=19.94, status="archived"))
    session.commit()
    draft_place = create_place(session, slug="draft-place", status="draft", title="Draft")
    archived_place = create_place(
        session,
        city_id="archived-city",
        slug="archived-place",
        title="Archived",
        lat=50.06,
        lon=19.94,
    )

    draft_response = client.post(
        "/api/reports",
        json={"target_type": "place", "target_id": draft_place.id, "reason": "wrong_data"},
    )
    archived_response = client.post(
        "/api/reports",
        json={"target_type": "place", "target_id": archived_place.id, "reason": "wrong_data"},
    )

    assert draft_response.status_code == 404
    assert archived_response.status_code == 404


def test_public_report_requires_public_photo_target(client_session) -> None:
    client, session = client_session
    session.add(City(id="archived-city", name="Archived", lat=50.06, lon=19.94, status="archived"))
    session.commit()
    public_place = create_place(session)
    draft_place = create_place(session, slug="draft-place", status="draft", title="Draft")
    archived_place = create_place(
        session,
        city_id="archived-city",
        slug="archived-place",
        title="Archived",
        lat=50.06,
        lon=19.94,
    )
    pending_photo = Photo(
        place_id=public_place.id,
        original_path="photos/pending-private.jpg",
        public_path="/media/photos/pending.jpg",
        thumb_path="/media/photos/pending-thumb.jpg",
        status="pending",
    )
    hidden_photo = Photo(
        place_id=draft_place.id,
        original_path="photos/hidden-private.jpg",
        public_path="/media/photos/hidden.jpg",
        thumb_path="/media/photos/hidden-thumb.jpg",
        status="approved",
    )
    archived_photo = Photo(
        place_id=archived_place.id,
        original_path="photos/archived-private.jpg",
        public_path="/media/photos/archived.jpg",
        thumb_path="/media/photos/archived-thumb.jpg",
        status="approved",
    )
    public_photo = Photo(
        place_id=public_place.id,
        original_path="photos/public-private.jpg",
        public_path="/media/photos/public.jpg",
        thumb_path="/media/photos/public-thumb.jpg",
        status="approved",
    )
    session.add(pending_photo)
    session.add(hidden_photo)
    session.add(archived_photo)
    session.add(public_photo)
    session.commit()
    session.refresh(pending_photo)
    session.refresh(hidden_photo)
    session.refresh(archived_photo)
    session.refresh(public_photo)

    pending_response = client.post(
        "/api/reports",
        json={"target_type": "photo", "target_id": pending_photo.id, "reason": "wrong_data"},
    )
    hidden_response = client.post(
        "/api/reports",
        json={"target_type": "photo", "target_id": hidden_photo.id, "reason": "wrong_data"},
    )
    archived_response = client.post(
        "/api/reports",
        json={"target_type": "photo", "target_id": archived_photo.id, "reason": "wrong_data"},
    )
    public_response = client.post(
        "/api/reports",
        json={"target_type": "photo", "target_id": public_photo.id, "reason": "wrong_data"},
    )

    assert pending_response.status_code == 404
    assert hidden_response.status_code == 404
    assert archived_response.status_code == 404
    assert public_response.status_code == 201


def test_public_report_requires_public_memory_target(client_session) -> None:
    client, session = client_session
    session.add(City(id="archived-city", name="Archived", lat=50.06, lon=19.94, status="archived"))
    session.commit()
    public_place = create_place(session)
    draft_place = create_place(session, slug="draft-place", status="draft", title="Draft")
    archived_place = create_place(
        session,
        city_id="archived-city",
        slug="archived-place",
        title="Archived",
        lat=50.06,
        lon=19.94,
    )
    pending_memory = Memory(
        place_id=public_place.id,
        caption="Pending",
        memory_text="Pending text",
        original_path="memories/pending-private.jpg",
        public_path="/media/memories/pending.jpg",
        thumb_path="/media/memories/pending-thumb.jpg",
        status="pending",
        claim_token_hash=claim_token_hash("pending-token"),
    )
    hidden_memory = Memory(
        place_id=draft_place.id,
        caption="Hidden",
        memory_text="Hidden text",
        original_path="memories/hidden-private.jpg",
        public_path="/media/memories/hidden.jpg",
        thumb_path="/media/memories/hidden-thumb.jpg",
        status="approved",
        claim_token_hash=claim_token_hash("hidden-token"),
    )
    archived_memory = Memory(
        place_id=archived_place.id,
        caption="Archived",
        memory_text="Archived text",
        original_path="memories/archived-private.jpg",
        public_path="/media/memories/archived.jpg",
        thumb_path="/media/memories/archived-thumb.jpg",
        status="approved",
        claim_token_hash=claim_token_hash("archived-token"),
    )
    public_memory = Memory(
        place_id=public_place.id,
        caption="Public",
        memory_text="Public text",
        original_path="memories/public-private.jpg",
        public_path="/media/memories/public.jpg",
        thumb_path="/media/memories/public-thumb.jpg",
        status="approved",
        claim_token_hash=claim_token_hash("public-token"),
    )
    session.add(pending_memory)
    session.add(hidden_memory)
    session.add(archived_memory)
    session.add(public_memory)
    session.commit()
    session.refresh(pending_memory)
    session.refresh(hidden_memory)
    session.refresh(archived_memory)
    session.refresh(public_memory)

    pending_response = client.post(
        "/api/reports",
        json={"target_type": "memory", "target_id": pending_memory.id, "reason": "wrong_data"},
    )
    hidden_response = client.post(
        "/api/reports",
        json={"target_type": "memory", "target_id": hidden_memory.id, "reason": "wrong_data"},
    )
    archived_response = client.post(
        "/api/reports",
        json={"target_type": "memory", "target_id": archived_memory.id, "reason": "wrong_data"},
    )
    public_response = client.post(
        "/api/reports",
        json={"target_type": "memory", "target_id": public_memory.id, "reason": "wrong_data"},
    )

    assert pending_response.status_code == 404
    assert hidden_response.status_code == 404
    assert archived_response.status_code == 404
    assert public_response.status_code == 201


def test_public_report_rejects_non_public_guide(client_session) -> None:
    client, session = client_session
    session.add(City(id="archived-city", name="Archived", lat=50.06, lon=19.94, status="archived"))
    session.commit()
    public_place = create_place(session)
    archived_place = create_place(
        session,
        city_id="archived-city",
        slug="archived-place",
        title="Archived",
        lat=50.06,
        lon=19.94,
    )
    draft_guide = Guide(slug="draft-guide", title="Draft guide", status="draft")
    public_guide = Guide(slug="public-guide", title="Public guide", status="published")
    archived_guide = Guide(slug="archived-guide", title="Archived guide", status="published")
    session.add(draft_guide)
    session.add(public_guide)
    session.add(archived_guide)
    session.commit()
    session.refresh(draft_guide)
    session.refresh(public_guide)
    session.refresh(archived_guide)
    session.add(PlaceGuide(guide_id=public_guide.id, place_id=public_place.id))
    session.add(PlaceGuide(guide_id=archived_guide.id, place_id=archived_place.id))
    session.commit()

    draft_response = client.post(
        "/api/reports",
        json={"target_type": "guide", "target_id": draft_guide.id, "reason": "wrong_data"},
    )
    archived_response = client.post(
        "/api/reports",
        json={"target_type": "guide", "target_id": archived_guide.id, "reason": "wrong_data"},
    )
    public_response = client.post(
        "/api/reports",
        json={"target_type": "guide", "target_id": public_guide.id, "reason": "wrong_data"},
    )

    assert draft_response.status_code == 404
    assert archived_response.status_code == 404
    assert public_response.status_code == 201
