import type { Place } from "../../api/client";

type SelectableGuidePlace = Pick<Place, "id" | "slug" | "status" | "title">;

export type GuidePlaceMoveDirection = "down" | "up";

export function filterSelectableGuidePlaces<TPlace extends SelectableGuidePlace>(
  places: TPlace[],
  guidePlaces: SelectableGuidePlace[],
  query: string,
) {
  const guidePlaceIds = new Set(guidePlaces.map((place) => place.id));
  const normalizedQuery = query.trim().toLowerCase();
  return places
    .filter((place) => !guidePlaceIds.has(place.id))
    .filter((place) => {
      if (!normalizedQuery) {
        return true;
      }
      return `${place.title} ${place.slug}`.toLowerCase().includes(normalizedQuery);
    })
    .sort((firstPlace, secondPlace) => firstPlace.title.localeCompare(secondPlace.title, "pl"));
}

export function toggleGuidePlaceSelection(selectedPlaceIds: string[], placeId: string) {
  return selectedPlaceIds.includes(placeId)
    ? selectedPlaceIds.filter((selectedPlaceId) => selectedPlaceId !== placeId)
    : [...selectedPlaceIds, placeId];
}

export function moveGuidePlace<TPlace extends { id: string }>(
  places: TPlace[],
  placeId: string,
  direction: GuidePlaceMoveDirection,
) {
  const currentIndex = places.findIndex((place) => place.id === placeId);
  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= places.length) {
    return places;
  }

  const nextPlaces = [...places];
  const currentPlace = nextPlaces[currentIndex];
  nextPlaces[currentIndex] = nextPlaces[nextIndex];
  nextPlaces[nextIndex] = currentPlace;
  return nextPlaces;
}
