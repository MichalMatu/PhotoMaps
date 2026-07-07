import type { AdminPlace, City } from "../../api/types";

type PlaceStatusSectionDefinition = {
  defaultExpanded: boolean;
  label: string;
  status: AdminPlace["status"];
};

export type PlaceStatusGroup = PlaceStatusSectionDefinition & {
  places: AdminPlace[];
};

export const PLACE_STATUS_SECTIONS: PlaceStatusSectionDefinition[] = [
  { defaultExpanded: true, label: "Opublikowane", status: "published" },
  { defaultExpanded: false, label: "Szkice", status: "draft" },
  { defaultExpanded: false, label: "Archiwalne", status: "archived" },
];

export type PlaceCityGroup = {
  city: City | null;
  cityId: string;
  cityName: string;
  places: AdminPlace[];
  sortOrder: number;
};

type PlaceCityGroupOptions = {
  includeEmptyCities?: boolean;
};

export function getPlaceCityGroups(
  cities: City[],
  places: AdminPlace[],
  { includeEmptyCities = true }: PlaceCityGroupOptions = {},
): PlaceCityGroup[] {
  const groupsByCityId = new Map<string, PlaceCityGroup>();
  const citiesById = new Map(cities.map((city) => [city.id, city]));

  if (includeEmptyCities) {
    for (const city of cities) {
      groupsByCityId.set(city.id, {
        city,
        cityId: city.id,
        cityName: city.name,
        places: [],
        sortOrder: city.sort_order,
      });
    }
  }

  for (const place of places) {
    const city = citiesById.get(place.city_id) ?? null;
    const group =
      groupsByCityId.get(place.city_id) ??
      ({
        city,
        cityId: place.city_id,
        cityName: city?.name ?? place.city_id,
        places: [],
        sortOrder: city?.sort_order ?? Number.MAX_SAFE_INTEGER,
      } satisfies PlaceCityGroup);
    group.places.push(place);
    groupsByCityId.set(place.city_id, group);
  }

  return Array.from(groupsByCityId.values()).sort((firstGroup, secondGroup) => {
    if (firstGroup.sortOrder !== secondGroup.sortOrder) {
      return firstGroup.sortOrder - secondGroup.sortOrder;
    }
    return firstGroup.cityName.localeCompare(secondGroup.cityName, "pl");
  });
}

export function getPlaceStatusGroups(places: AdminPlace[]): PlaceStatusGroup[] {
  return PLACE_STATUS_SECTIONS.map((section) => ({
    ...section,
    places: places.filter((place) => place.status === section.status),
  })).filter((section) => section.places.length > 0);
}
