import type { Category, City, Place, ReviewStatus } from "../../api/types";

export type AdminMediaItem = {
  id: string;
  place_id: string;
  status: ReviewStatus;
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

export type AdminMediaCityGroup<TItem extends AdminMediaItem> = {
  city: City | null;
  cityId: string;
  cityName: string;
  itemCount: number;
  placeGroups: Array<AdminMediaPlaceGroup<TItem>>;
  sortOrder: number;
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
    if (!place) {
      continue;
    }
    const placeId = place.id;
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

export function groupAdminMediaPlaceGroupsByCity<TItem extends AdminMediaItem>(
  placeGroups: Array<AdminMediaPlaceGroup<TItem>>,
  cities: City[],
): Array<AdminMediaCityGroup<TItem>> {
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const groupsByCityId = new Map<string, AdminMediaCityGroup<TItem>>();

  for (const placeGroup of placeGroups) {
    const cityId = placeGroup.place?.city_id ?? "";
    const city = cityById.get(cityId) ?? null;
    const group =
      groupsByCityId.get(cityId) ??
      ({
        city,
        cityId,
        cityName: city?.name ?? (cityId || "Bez miasta"),
        itemCount: 0,
        placeGroups: [],
        sortOrder: city?.sort_order ?? Number.MAX_SAFE_INTEGER,
      } satisfies AdminMediaCityGroup<TItem>);

    group.itemCount += placeGroup.items.length;
    group.placeGroups.push(placeGroup);
    groupsByCityId.set(cityId, group);
  }

  return Array.from(groupsByCityId.values()).sort((firstGroup, secondGroup) => {
    if (firstGroup.sortOrder !== secondGroup.sortOrder) {
      return firstGroup.sortOrder - secondGroup.sortOrder;
    }
    return firstGroup.cityName.localeCompare(secondGroup.cityName, "pl");
  });
}
