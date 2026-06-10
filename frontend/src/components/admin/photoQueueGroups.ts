import type { Category, Photo, Place } from "../../api/client";

export type PhotoPlaceGroup = {
  categoryLabel: string;
  photos: Photo[];
  place: Place | null;
  placeId: string;
  title: string;
};

export function groupPhotosByPlace(
  photos: Photo[],
  places: Place[],
  categories: Category[],
): PhotoPlaceGroup[] {
  const placeById = new Map(places.map((place) => [place.id, place]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const groupByPlaceId = new Map<string, PhotoPlaceGroup>();

  for (const photo of photos) {
    const place = placeById.get(photo.place_id) ?? null;
    const placeId = place?.id ?? photo.place_id;
    const existingGroup = groupByPlaceId.get(placeId);
    if (existingGroup) {
      existingGroup.photos.push(photo);
      continue;
    }

    const categoryLabel = place?.category_id ? categoryById.get(place.category_id)?.label ?? place.category_id : "Bez kategorii";
    groupByPlaceId.set(placeId, {
      categoryLabel,
      photos: [photo],
      place,
      placeId,
      title: place?.title ?? photo.place_id,
    });
  }

  return Array.from(groupByPlaceId.values()).sort((firstGroup, secondGroup) =>
    firstGroup.title.localeCompare(secondGroup.title, "pl"),
  );
}
