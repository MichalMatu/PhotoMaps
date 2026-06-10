from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.category import Category
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.category import CategoryRead
from app.schemas.place import PlaceMapRead, PlaceRead
from app.api.routes.photos import photo_to_read
from app.schemas.photo import PhotoRead
from app.services.places import sort_places_for_public_map
from app.services.ranking import place_score

router = APIRouter(prefix="/api/places", tags=["places"])


def place_to_read(place: Place) -> PlaceRead:
    return PlaceRead(
        id=place.id,
        slug=place.slug,
        title=place.title,
        description=place.description,
        local_comment=place.local_comment,
        category_id=place.category_id,
        lat=place.lat,
        lon=place.lon,
        weight=place.weight,
        status=place.status,
        photo_count=place.photo_count,
        memory_count=place.memory_count,
        cover_photo_id=place.cover_photo_id,
        score=place_score(place),
        created_at=place.created_at,
        updated_at=place.updated_at,
    )


def category_to_read(category: Category) -> CategoryRead:
    return CategoryRead(
        id=category.id,
        label=category.label,
        description=category.description,
        icon=category.icon,
        sort_order=category.sort_order,
        status=category.status,
    )


def place_to_map_read(
    place: Place,
    category: Category | None,
    photos: list[PhotoRead],
) -> PlaceMapRead:
    cover_photo = next((photo for photo in photos if photo.id == place.cover_photo_id), photos[0] if photos else None)
    return PlaceMapRead(
        **place_to_read(place).model_dump(),
        category=category_to_read(category) if category else None,
        cover_photo=cover_photo,
        photos=photos,
    )


@router.get("", response_model=list[PlaceRead])
def list_places(session: Session = Depends(get_session)) -> list[PlaceRead]:
    statement = select(Place).where(Place.status == "published")
    places = sort_places_for_public_map(list(session.exec(statement).all()))
    return [place_to_read(place) for place in places]


@router.get("/map", response_model=list[PlaceMapRead])
def list_map_places(session: Session = Depends(get_session)) -> list[PlaceMapRead]:
    statement = select(Place).where(Place.status == "published")
    places = sort_places_for_public_map(list(session.exec(statement).all()))
    if not places:
        return []

    place_ids = [place.id for place in places]
    category_ids = {place.category_id for place in places if place.category_id is not None}
    category_by_id: dict[str, Category] = {}
    if category_ids:
        categories = session.exec(select(Category).where(Category.id.in_(category_ids))).all()
        category_by_id = {category.id: category for category in categories}

    photos_by_place_id: dict[str, list[PhotoRead]] = {place_id: [] for place_id in place_ids}
    photos = session.exec(
        select(Photo)
        .where(Photo.place_id.in_(place_ids))
        .where(Photo.status == "approved")
        .order_by(Photo.approved_at.desc(), Photo.created_at.desc())
    ).all()
    for photo in photos:
        photos_by_place_id[photo.place_id].append(photo_to_read(photo))

    for place in places:
        if place.cover_photo_id is not None:
            photos_by_place_id[place.id].sort(key=lambda photo: photo.id != place.cover_photo_id)

    return [
        place_to_map_read(
            place,
            category_by_id.get(place.category_id) if place.category_id else None,
            photos_by_place_id[place.id],
        )
        for place in places
    ]


@router.get("/{id_or_slug}", response_model=PlaceRead)
def get_place(id_or_slug: str, session: Session = Depends(get_session)) -> PlaceRead:
    statement = (
        select(Place)
        .where((Place.id == id_or_slug) | (Place.slug == id_or_slug))
        .where(Place.status == "published")
    )
    place = session.exec(statement).first()
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return place_to_read(place)
