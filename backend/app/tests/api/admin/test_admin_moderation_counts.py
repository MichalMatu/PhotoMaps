from app.models.memory import Memory
from app.models.photo import Photo
from app.models.report import Report
from app.services.tokens import claim_token_hash
from app.tests.support import ADMIN_HEADERS, create_place


def test_admin_moderation_counts_are_database_totals_not_loaded_page_size(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    for index in range(101):
        session.add(
            Photo(
                place_id=place.id,
                original_path=f"photos/{index}-original.jpg",
                public_path=f"/media/photos/{index}.jpg",
                thumb_path=f"/media/photos/{index}-thumb.jpg",
                status="approved",
            )
        )
    session.add(
        Photo(
            place_id=place.id,
            original_path="photos/pending-original.jpg",
            public_path="/media/photos/pending.jpg",
            thumb_path="/media/photos/pending-thumb.jpg",
            status="pending",
        )
    )
    session.add(
        Photo(
            place_id=place.id,
            original_path="photos/rejected-original.jpg",
            public_path="/media/photos/rejected.jpg",
            thumb_path="/media/photos/rejected-thumb.jpg",
            status="rejected",
        )
    )
    session.add(
        Photo(
            place_id="deleted-place",
            original_path="photos/orphan-original.jpg",
            public_path="/media/photos/orphan.jpg",
            thumb_path="/media/photos/orphan-thumb.jpg",
            status="approved",
        )
    )
    session.add(
        Memory(
            place_id=place.id,
            caption="Pamiątka oczekująca",
            memory_text="Treść pamiątki",
            original_path="memories/pending-original.jpg",
            public_path="/media/memories/pending.jpg",
            thumb_path="/media/memories/pending-thumb.jpg",
            status="pending",
            claim_token_hash=claim_token_hash("pending-token"),
        )
    )
    session.add(
        Memory(
            place_id=place.id,
            caption="Pamiątka zatwierdzona",
            memory_text="Treść pamiątki",
            original_path="memories/approved-original.jpg",
            public_path="/media/memories/approved.jpg",
            thumb_path="/media/memories/approved-thumb.jpg",
            status="approved",
            claim_token_hash=claim_token_hash("approved-token"),
        )
    )
    session.add(
        Memory(
            place_id="deleted-place",
            caption="Osierocona pamiątka",
            memory_text="Treść pamiątki",
            original_path="memories/orphan-original.jpg",
            public_path="/media/memories/orphan.jpg",
            thumb_path="/media/memories/orphan-thumb.jpg",
            status="approved",
            claim_token_hash=claim_token_hash("orphan-token"),
        )
    )
    session.add(Report(target_type="place", target_id=place.id, reason="wrong_data", status="open"))
    session.add(Report(target_type="place", target_id=place.id, reason="wrong_data", status="closed"))
    session.commit()

    list_response = client.get("/api/admin/photos?limit=100", headers=ADMIN_HEADERS)
    count_response = client.get("/api/admin/moderation/counts", headers=ADMIN_HEADERS)

    assert list_response.status_code == 200
    assert len(list_response.json()) == 100
    assert count_response.status_code == 200
    assert count_response.json() == {
        "photos": {"all": 103, "pending": 1, "approved": 101, "rejected": 1},
        "memories": {"all": 2, "pending": 1, "approved": 1, "rejected": 0},
        "reports": {"all": 2, "open": 1, "closed": 1},
    }


def test_admin_moderation_counts_require_admin_token(client_session) -> None:
    client, _session = client_session

    response = client.get("/api/admin/moderation/counts")

    assert response.status_code == 401
