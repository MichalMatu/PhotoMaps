import type { AdminPlace, City } from "../../api/types";

export type PlaceCityGroup = {
  city: City | null;
  cityId: string;
  cityName: string;
  places: AdminPlace[];
};

type PlaceCityGroupOptions = {
  includeEmptyCities?: boolean;
};

function compareText(firstValue: string, secondValue: string) {
  return firstValue.localeCompare(secondValue, "pl", { sensitivity: "base" });
}

function comparePlacesByTitle(firstPlace: AdminPlace, secondPlace: AdminPlace) {
  return (
    compareText(firstPlace.title, secondPlace.title) ||
    compareText(firstPlace.slug, secondPlace.slug) ||
    compareText(firstPlace.id, secondPlace.id)
  );
}

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
      } satisfies PlaceCityGroup);
    group.places.push(place);
    groupsByCityId.set(place.city_id, group);
  }

  return Array.from(groupsByCityId.values())
    .sort((firstGroup, secondGroup) => {
      if (firstGroup.city && !secondGroup.city) {
        return -1;
      }
      if (!firstGroup.city && secondGroup.city) {
        return 1;
      }
      return (
        compareText(firstGroup.cityName, secondGroup.cityName) || compareText(firstGroup.cityId, secondGroup.cityId)
      );
    })
    .map((group) => ({
      ...group,
      places: [...group.places].sort(comparePlacesByTitle),
    }));
}
