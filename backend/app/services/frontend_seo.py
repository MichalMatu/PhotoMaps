from urllib.parse import quote, unquote

from fastapi import Request
from sqlmodel import Session

from app.core.config import PUBLIC_SITE_URL
from app.db.session import engine
from app.models.city import City
from app.models.guide import Guide
from app.models.place import Place
from app.runtime import FrontendSeoMetadata
from app.services.guide_previews import approved_cover_photos_by_place
from app.services.places import list_public_place_photos, public_places_statement
from app.services.public_guides import public_guide_by_slug

HOME_TITLE = "PhotoMap | Wizualna mapa Wrocławia"
HOME_DESCRIPTION = (
    "Odkrywaj Wrocław przez zdjęcia, pamiątki i krótkie trasy. "
    "PhotoMap pokazuje miejsca z klimatem jako wizualną mapę miniaturek."
)
GUIDES_TITLE = "Trasy i kolekcje miejsc | PhotoMap"
GUIDES_DESCRIPTION = "Gotowe trasy i kolekcje miejsc we Wrocławiu: zdjęcia, opisy i punkty warte zobaczenia."
ADMIN_TITLE = "Panel admina | PhotoMap"
ADMIN_DESCRIPTION = "Prywatny panel korekt, moderacji i konfiguracji PhotoMap."
PLACE_FALLBACK_DESCRIPTION = "Zobacz miejsce w PhotoMap: zdjęcia, pamiątki i kontekst na wizualnej mapie Wrocławia."
GUIDE_FALLBACK_DESCRIPTION = "Zobacz trasę lub kolekcję miejsc w PhotoMap: punkty, zdjęcia i opis przejścia."
UNKNOWN_TITLE = "Strona niedostępna | PhotoMap"
UNKNOWN_DESCRIPTION = "Ta strona PhotoMap nie jest publicznie dostępna. Przejdź do mapy lub listy tras i kolekcji."
MAX_DESCRIPTION_LENGTH = 170


def normalized_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = " ".join(value.split())
    return text or None


def meta_description(value: str | None, fallback: str) -> str:
    description = normalized_text(value) or fallback
    if len(description) <= MAX_DESCRIPTION_LENGTH:
        return description

    shortened = description[: MAX_DESCRIPTION_LENGTH - 3].rsplit(" ", 1)[0].rstrip(" .,;:")
    return f"{shortened}..."


def public_base_url(request: Request) -> str:
    if PUBLIC_SITE_URL:
        return PUBLIC_SITE_URL
    return str(request.base_url).rstrip("/")


def absolute_url(base_url: str, path: str) -> str:
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{base_url}{path}"


def website_structured_data(base_url: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "PhotoMap",
        "alternateName": "photomap.pl",
        "url": absolute_url(base_url, "/"),
        "description": "Wizualna mapa miejsc, zdjęć, pamiątek oraz krótkich tras i kolekcji.",
    }


def web_page_structured_data(title: str, description: str, canonical_url: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title,
        "description": description,
        "url": canonical_url,
        "isPartOf": {"@type": "WebSite", "name": "PhotoMap"},
    }


def breadcrumb_structured_data(base_url: str, items: list[tuple[str, str]]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": index,
                "name": name,
                "item": absolute_url(base_url, path),
            }
            for index, (name, path) in enumerate(items, start=1)
        ],
    }


def home_metadata(base_url: str) -> FrontendSeoMetadata:
    canonical_url = absolute_url(base_url, "/")
    return FrontendSeoMetadata(
        title=HOME_TITLE,
        description=HOME_DESCRIPTION,
        canonical_url=canonical_url,
        structured_data=[
            website_structured_data(base_url),
            web_page_structured_data(HOME_TITLE, HOME_DESCRIPTION, canonical_url),
        ],
    )


def admin_metadata(base_url: str) -> FrontendSeoMetadata:
    return FrontendSeoMetadata(
        title=ADMIN_TITLE,
        description=ADMIN_DESCRIPTION,
        canonical_url=absolute_url(base_url, "/admin"),
        robots="noindex,nofollow",
    )


def noindex_metadata(
    base_url: str,
    path: str,
    title: str = UNKNOWN_TITLE,
    description: str = UNKNOWN_DESCRIPTION,
) -> FrontendSeoMetadata:
    return FrontendSeoMetadata(
        title=title,
        description=description,
        canonical_url=absolute_url(base_url, path),
        robots="noindex,follow",
    )


def guides_metadata(base_url: str) -> FrontendSeoMetadata:
    canonical_url = absolute_url(base_url, "/guides")
    return FrontendSeoMetadata(
        title=GUIDES_TITLE,
        description=GUIDES_DESCRIPTION,
        canonical_url=canonical_url,
        structured_data=[
            web_page_structured_data(GUIDES_TITLE, GUIDES_DESCRIPTION, canonical_url),
            breadcrumb_structured_data(base_url, [("PhotoMap", "/"), ("Trasy i kolekcje", "/guides")]),
        ],
    )


def place_structured_data(base_url: str, place: Place, city: City | None, image_url: str | None) -> dict:
    data = {
        "@context": "https://schema.org",
        "@type": "Place",
        "name": place.title,
        "url": absolute_url(base_url, f"/places/{quote(place.slug, safe='')}"),
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": place.lat,
            "longitude": place.lon,
        },
    }
    description = normalized_text(place.description)
    if description is not None:
        data["description"] = description
    if city is not None:
        data["containedInPlace"] = {"@type": "City", "name": city.name}
    if image_url is not None:
        data["image"] = image_url
    return data


def place_metadata(base_url: str, session: Session, slug: str) -> FrontendSeoMetadata | None:
    place = session.exec(public_places_statement().where(Place.slug == slug)).first()
    if place is None:
        return None

    city = session.get(City, place.city_id)
    photos = list_public_place_photos(session, place)
    image_url = absolute_url(base_url, photos[0].public_path) if photos else None
    title = f"{place.title} | PhotoMap"
    description = meta_description(place.description, PLACE_FALLBACK_DESCRIPTION)
    canonical_path = f"/places/{quote(place.slug, safe='')}"
    canonical_url = absolute_url(base_url, canonical_path)
    return FrontendSeoMetadata(
        title=title,
        description=description,
        canonical_url=canonical_url,
        image_url=image_url,
        structured_data=[
            web_page_structured_data(title, description, canonical_url),
            breadcrumb_structured_data(
                base_url,
                [("PhotoMap", "/"), ("Miejsca", "/"), (place.title, canonical_path)],
            ),
            place_structured_data(base_url, place, city, image_url),
        ],
    )


def guide_item_list_structured_data(base_url: str, guide: Guide, places: list[Place]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": guide.title,
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": index,
                "url": absolute_url(base_url, f"/places/{quote(place.slug, safe='')}"),
                "name": place.title,
            }
            for index, place in enumerate(places, start=1)
        ],
    }


def guide_metadata(base_url: str, session: Session, slug: str) -> FrontendSeoMetadata | None:
    public_guide = public_guide_by_slug(session, slug)
    if public_guide is None:
        return None

    guide, places = public_guide
    cover_photos = approved_cover_photos_by_place(session, places)
    cover_photo = next((cover_photos[place.id] for place in places if place.id in cover_photos), None)
    image_url = absolute_url(base_url, cover_photo.public_path) if cover_photo else None
    title = f"{guide.title} | PhotoMap"
    description = meta_description(guide.description, GUIDE_FALLBACK_DESCRIPTION)
    canonical_path = f"/guides/{quote(guide.slug, safe='')}"
    canonical_url = absolute_url(base_url, canonical_path)
    return FrontendSeoMetadata(
        title=title,
        description=description,
        canonical_url=canonical_url,
        image_url=image_url,
        structured_data=[
            web_page_structured_data(title, description, canonical_url),
            breadcrumb_structured_data(
                base_url,
                [("PhotoMap", "/"), ("Trasy i kolekcje", "/guides"), (guide.title, canonical_path)],
            ),
            guide_item_list_structured_data(base_url, guide, places),
        ],
    )


def build_frontend_seo_metadata(request_path: str, request: Request) -> FrontendSeoMetadata:
    base_url = public_base_url(request)
    if request_path in {"", "/"}:
        return home_metadata(base_url)
    if request_path == "/admin":
        return admin_metadata(base_url)
    if request_path == "/guides":
        return guides_metadata(base_url)

    with Session(engine) as session:
        if request_path.startswith("/places/") and request_path.count("/") == 2:
            metadata = place_metadata(base_url, session, unquote(request_path.removeprefix("/places/")))
            return metadata or noindex_metadata(
                base_url,
                request_path,
                "Miejsce niedostępne | PhotoMap",
                "To miejsce nie jest publicznie dostępne w PhotoMap.",
            )
        if request_path.startswith("/guides/") and request_path.count("/") == 2:
            metadata = guide_metadata(base_url, session, unquote(request_path.removeprefix("/guides/")))
            return metadata or noindex_metadata(
                base_url,
                request_path,
                "Trasa niedostępna | PhotoMap",
                "Ta trasa albo kolekcja nie jest publicznie dostępna w PhotoMap.",
            )

    return noindex_metadata(base_url, request_path)
