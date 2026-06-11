import type { Category, Place } from "../../api/client";

export type AdminMediaItem = {
  id: string;
  place_id: string;
  status: string;
  thumb_path: string;
};

export type AdminMediaPlaceGroup<TItem extends AdminMediaItem> = {
  categoryLabel: string;
  coverItem: TItem;
  items: TItem[];
  place: Place | null;
  placeId: string;
  title: string;
};

export function groupAdminMediaByPlace<TItem extends AdminMediaItem>(
  items: TItem[],
  places: Place[],
  categories: Category[],
  selectCoverItem: (groupItems: TItem[], place: Place | null) => TItem = (groupItems) => groupItems[0],
): AdminMediaPlaceGroup<TItem>[] {
  const placeById = new Map(places.map((place) => [place.id, place]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const itemsByPlaceId = new Map<string, TItem[]>();

  for (const item of items) {
    const place = placeById.get(item.place_id);
    const placeId = place?.id ?? item.place_id;
    const groupItems = itemsByPlaceId.get(placeId) ?? [];
    groupItems.push(item);
    itemsByPlaceId.set(placeId, groupItems);
  }

  return Array.from(itemsByPlaceId.entries())
    .map(([placeId, groupItems]) => {
      const place = placeById.get(placeId) ?? null;
      const categoryLabel = place?.category_ids.length
        ? place.category_ids.map((categoryId) => categoryById.get(categoryId)?.label ?? categoryId).join(", ")
        : "Bez kategorii";
      return {
        categoryLabel,
        coverItem: selectCoverItem(groupItems, place),
        items: groupItems,
        place,
        placeId,
        title: place?.title ?? placeId,
      };
    })
    .sort((firstGroup, secondGroup) => firstGroup.title.localeCompare(secondGroup.title, "pl"));
}

export function selectPhotoAlbumCover<TItem extends AdminMediaItem>(groupItems: TItem[], place: Place | null): TItem {
  if (place?.cover_photo_id) {
    const coverItem = groupItems.find((item) => item.id === place.cover_photo_id);
    if (coverItem) {
      return coverItem;
    }
  }

  return groupItems.find((item) => item.status === "approved") ?? groupItems[0];
}
