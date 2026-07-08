import type { Category, City, Place } from "../../api/types";

export function compareAdminText(firstValue: string, secondValue: string) {
  return firstValue.localeCompare(secondValue, "pl", { sensitivity: "base" });
}

function compareAdminCitiesByName<TCity extends Pick<City, "id" | "name">>(firstCity: TCity, secondCity: TCity) {
  return compareAdminText(firstCity.name, secondCity.name) || compareAdminText(firstCity.id, secondCity.id);
}

export function sortAdminCitiesByName<TCity extends Pick<City, "id" | "name">>(cities: TCity[]) {
  return [...cities].sort(compareAdminCitiesByName);
}

function compareAdminCategoriesByLabel<TCategory extends Pick<Category, "id" | "label">>(
  firstCategory: TCategory,
  secondCategory: TCategory,
) {
  return (
    compareAdminText(firstCategory.label, secondCategory.label) || compareAdminText(firstCategory.id, secondCategory.id)
  );
}

export function sortAdminCategoriesByLabel<TCategory extends Pick<Category, "id" | "label">>(categories: TCategory[]) {
  return [...categories].sort(compareAdminCategoriesByLabel);
}

export function compareAdminPlacesByTitle<TPlace extends Pick<Place, "id" | "slug" | "title">>(
  firstPlace: TPlace,
  secondPlace: TPlace,
) {
  return (
    compareAdminText(firstPlace.title, secondPlace.title) ||
    compareAdminText(firstPlace.slug, secondPlace.slug) ||
    compareAdminText(firstPlace.id, secondPlace.id)
  );
}

export function sortAdminPlacesByTitle<TPlace extends Pick<Place, "id" | "slug" | "title">>(places: TPlace[]) {
  return [...places].sort(compareAdminPlacesByTitle);
}
