import type { AdminPlace, City } from "../../api/types";

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
