import { expect, type APIRequestContext } from "@playwright/test";

import { PHOTO_BUFFER } from "../fixtures/media";
import { ADMIN_TOKEN, API_URL } from "./config";

type CategoryResponse = {
  id: string;
};

type CityResponse = {
  id: string;
};

type PlaceResponse = {
  city_id: string;
  id: string;
  title: string;
};

type PhotoResponse = {
  id: string;
};

type AppConfigResponse = {
  map: {
    fallback_center: { lat: number; lon: number };
  };
};

type MapPlaceResponse = {
  cover_photo: { caption: string | null } | null;
  id: string;
  memory_count: number;
  photo_count: number;
  preview_items: Array<{ caption: string | null; kind: "memory" | "photo" }>;
  title: string;
};

function adminHeaders() {
  return {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  };
}

export async function expectJson<T>(
  responsePromise: Promise<{ status: () => number; text: () => Promise<string> }>,
  status: number,
) {
  const response = await responsePromise;
  const body = await response.text();
  expect(response.status(), body).toBe(status);
  return JSON.parse(body) as T;
}

export async function createCategory(request: APIRequestContext, suffix: string) {
  return expectJson<CategoryResponse>(
    request.post(`${API_URL}/api/admin/categories`, {
      data: {
        description: "Kategoria dla e2e",
        icon: "map-pin",
        id: `e2e-category-${suffix}`,
        label: `E2E kategoria ${suffix}`,
        sort_order: 99,
        status: "active",
      },
      headers: adminHeaders(),
    }),
    201,
  );
}

async function getDefaultCityId(request: APIRequestContext) {
  const cities = await expectJson<CityResponse[]>(request.get(`${API_URL}/api/cities`), 200);
  expect(cities.length, "seeded e2e city").toBeGreaterThan(0);
  return cities[0].id;
}

export async function createPlace(
  request: APIRequestContext,
  categoryId: string,
  suffix: string,
  overrides: Partial<{ lat: number; lon: number; title: string }> = {},
) {
  const cityId = await getDefaultCityId(request);
  return expectJson<PlaceResponse>(
    request.post(`${API_URL}/api/admin/places`, {
      data: {
        category_ids: [categoryId],
        city_id: cityId,
        description: "Miejsce przygotowane przez test e2e",
        lat: overrides.lat ?? 51.1079,
        local_comment: "Lokalny komentarz e2e",
        lon: overrides.lon ?? 17.0385,
        slug: `e2e-place-${suffix}`,
        status: "published",
        title: overrides.title ?? `E2E miejsce ${suffix}`,
        weight: 1,
      },
      headers: adminHeaders(),
    }),
    201,
  );
}

export async function getPublicMapStart(request: APIRequestContext) {
  const config = await expectJson<AppConfigResponse>(request.get(`${API_URL}/api/app-config`), 200);
  return config.map.fallback_center;
}

export async function getMapPlaces(request: APIRequestContext, cityId: string) {
  return expectJson<MapPlaceResponse[]>(
    request.get(`${API_URL}/api/places/map?city_id=${encodeURIComponent(cityId)}`),
    200,
  );
}

export async function uploadApprovedPhoto(request: APIRequestContext, placeId: string, caption: string) {
  const photo = await expectJson<PhotoResponse>(
    request.post(`${API_URL}/api/admin/places/${placeId}/photos`, {
      headers: adminHeaders(),
      multipart: {
        caption,
        file: {
          buffer: PHOTO_BUFFER,
          mimeType: "image/jpeg",
          name: "e2e-photo.jpg",
        },
      },
    }),
    201,
  );
  await expectJson<PhotoResponse>(
    request.post(`${API_URL}/api/admin/photos/${photo.id}/review`, {
      data: { status: "approved" },
      headers: adminHeaders(),
    }),
    200,
  );
  return photo;
}
