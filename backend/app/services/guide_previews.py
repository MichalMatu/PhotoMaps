from sqlmodel import Session, select

from app.models.photo import Photo
from app.models.place import Place


def approved_cover_photos_by_place(session: Session, places: list[Place]) -> dict[str, Photo]:
    place_ids = [place.id for place in places]
    if not place_ids:
        return {}

    photos_by_place_id: dict[str, list[Photo]] = {place_id: [] for place_id in place_ids}
    photos = session.exec(
        select(Photo)
        .where(Photo.place_id.in_(place_ids))
        .where(Photo.status == "approved")
        .order_by(Photo.approved_at.desc(), Photo.created_at.desc())
    ).all()
    for photo in photos:
        photos_by_place_id[photo.place_id].append(photo)

    cover_photos_by_place: dict[str, Photo] = {}
    for place in places:
        place_photos = photos_by_place_id[place.id]
        if place.cover_photo_id is not None:
            place_photos.sort(key=lambda photo: photo.id != place.cover_photo_id)
        if place_photos:
            cover_photos_by_place[place.id] = place_photos[0]

    return cover_photos_by_place
