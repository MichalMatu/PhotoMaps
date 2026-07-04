import type { Page } from "@playwright/test";
import type { AdminMemory, AdminModerationCounts, AdminPhoto, Report } from "../../src/api/types";

import {
  adminGuides,
  adminPlaces,
  appConfig,
  categories,
  city,
  guideDetail,
  guides,
  nadodrzeCover,
  placeDetail,
  places,
  rynekCover,
  rynekMemory,
  rynekSide,
} from "../fixtures/visualData";
import { API_URL } from "./config";

function imageSvg(url: string) {
  const isSecondary = url.includes("nadodrze") || url.includes("side");
  const fill = isSecondary ? "#0a84ff" : "#34c759";
  const accent = isSecondary ? "#ffd60a" : "#0a84ff";
  if (url.includes("portrait")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640">
      <rect width="360" height="640" fill="${fill}"/>
      <rect x="36" y="52" width="288" height="536" rx="28" fill="${accent}" opacity=".72"/>
      <rect x="78" y="112" width="204" height="360" rx="18" fill="#ffffff" opacity=".28"/>
      <rect x="118" y="486" width="124" height="72" rx="18" fill="#000000" opacity=".18"/>
    </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <rect width="640" height="420" fill="${fill}"/>
    <rect x="44" y="46" width="552" height="328" rx="28" fill="${accent}" opacity=".72"/>
    <rect x="84" y="86" width="220" height="248" rx="18" fill="#ffffff" opacity=".28"/>
    <rect x="336" y="112" width="220" height="188" rx="18" fill="#000000" opacity=".18"/>
  </svg>`;
}

function tileSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#eef3e8"/>
    <path d="M0 80h256M0 176h256M80 0v256M176 0v256" stroke="#d1dcc9" stroke-width="5"/>
    <path d="M-20 220C60 172 114 186 276 124" stroke="#9fb3c8" stroke-width="18" fill="none" opacity=".7"/>
    <path d="M-10 42C72 80 148 82 266 36" stroke="#e2d4a2" stroke-width="10" fill="none" opacity=".9"/>
  </svg>`;
}

function apiListPath(path: string) {
  return (url: URL) => url.href === `${API_URL}${path}` || url.href.startsWith(`${API_URL}${path}?`);
}

function pagedQueueItems<TItem extends { status: string }>(requestUrl: string, items: TItem[]) {
  const url = new URL(requestUrl);
  const status = url.searchParams.get("status");
  const limit = Number(url.searchParams.get("limit") ?? items.length);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const filteredItems = status ? items.filter((item) => item.status === status) : items;
  return filteredItems.slice(offset, offset + limit);
}

export async function mockSharedApi(page: Page, mapPlaces = places, guideList = guides, cityList = [city]) {
  await page.route("https://*.tile.openstreetmap.org/**", (route) =>
    route.fulfill({ body: tileSvg(), contentType: "image/svg+xml" }),
  );
  await page.route(`${API_URL}/media/**`, (route) =>
    route.fulfill({ body: imageSvg(route.request().url()), contentType: "image/svg+xml" }),
  );
  for (const mapCity of cityList) {
    await page.route(`${API_URL}/api/places/map?city_id=${encodeURIComponent(mapCity.id)}`, (route) =>
      route.fulfill({ json: mapPlaces.filter((place) => place.city_id === mapCity.id) }),
    );
  }
  await page.route(`${API_URL}/api/places/${places[0].slug}`, (route) => route.fulfill({ json: placeDetail }));
  await page.route(`${API_URL}/api/places/${places[0].id}/photos`, (route) =>
    route.fulfill({ json: [rynekCover, rynekSide] }),
  );
  await page.route(`${API_URL}/api/places/${places[0].id}/memories/${rynekMemory.id}`, (route) =>
    route.fulfill({ json: rynekMemory }),
  );
  await page.route(`${API_URL}/api/categories`, (route) => route.fulfill({ json: categories }));
  await page.route(`${API_URL}/api/cities`, (route) => route.fulfill({ json: cityList }));
  await page.route(`${API_URL}/api/app-config`, (route) => route.fulfill({ json: appConfig }));
  await page.route(`${API_URL}/api/guides`, (route) => route.fulfill({ json: guideList }));
  await page.route(`${API_URL}/api/guides/wizualny-spacer`, (route) => route.fulfill({ json: guideDetail }));
}

type MockAdminApiOptions = {
  adminCategoryList?: typeof categories;
  adminCityList?: Array<typeof city>;
  adminGuideList?: typeof adminGuides;
  adminMemoryList?: AdminMemory[];
  adminModerationCounts?: AdminModerationCounts;
  adminPlaceList?: typeof adminPlaces;
  adminPhotoList?: AdminPhoto[];
  adminReportList?: Report[];
};

function reviewStatusCounts(items: Array<{ status: "approved" | "pending" | "rejected" }>) {
  return {
    all: items.length,
    approved: items.filter((item) => item.status === "approved").length,
    pending: items.filter((item) => item.status === "pending").length,
    rejected: items.filter((item) => item.status === "rejected").length,
  };
}

function reportStatusCounts(items: Array<{ status: "closed" | "open" }>) {
  return {
    all: items.length,
    closed: items.filter((item) => item.status === "closed").length,
    open: items.filter((item) => item.status === "open").length,
  };
}

export async function mockAdminApi(page: Page, options: MockAdminApiOptions = {}) {
  const adminCategoryList = options.adminCategoryList ?? categories;
  const adminCityList = options.adminCityList ?? [city];
  const adminGuideList = options.adminGuideList ?? adminGuides;
  const adminMemoryList = options.adminMemoryList ?? [];
  const adminPlaceList = options.adminPlaceList ?? adminPlaces;
  const adminPhotoList = options.adminPhotoList ?? [rynekCover, rynekSide, nadodrzeCover];
  const adminReportList = options.adminReportList ?? [];
  const adminModerationCounts = options.adminModerationCounts ?? {
    memories: reviewStatusCounts(adminMemoryList),
    photos: reviewStatusCounts(adminPhotoList),
    reports: reportStatusCounts(adminReportList),
  };

  await mockSharedApi(page);
  await page.route(`${API_URL}/api/admin/app-config`, (route) => route.fulfill({ json: appConfig }));
  await page.route(`${API_URL}/api/admin/categories`, (route) => route.fulfill({ json: adminCategoryList }));
  await page.route(`${API_URL}/api/admin/cities`, (route) => route.fulfill({ json: adminCityList }));
  await page.route(`${API_URL}/api/admin/moderation/counts`, (route) => route.fulfill({ json: adminModerationCounts }));
  await page.route(`${API_URL}/api/admin/guides`, (route) => route.fulfill({ json: adminGuideList }));
  await page.route(`${API_URL}/api/admin/guides/*`, (route) => {
    const guideId = route.request().url().split("/").pop();
    const guide = adminGuideList.find((adminGuide) => adminGuide.id === guideId);
    if (!guide) {
      route.fulfill({ json: { detail: "Guide not found" }, status: 404 });
      return;
    }
    route.fulfill({ json: { ...guide, places: guide.preview_places } });
  });
  await page.route(apiListPath("/api/admin/memories"), (route) => {
    route.fulfill({ json: pagedQueueItems(route.request().url(), adminMemoryList) });
  });
  await page.route(`${API_URL}/api/admin/places`, (route) => route.fulfill({ json: adminPlaceList }));
  await page.route(`${API_URL}/api/admin/places/*/photos`, (route) => {
    const [, placeId] =
      route
        .request()
        .url()
        .match(/\/api\/admin\/places\/([^/]+)\/photos/) ?? [];
    route.fulfill({
      json: adminPhotoList.filter((photo) => photo.place_id === placeId),
    });
  });
  await page.route(apiListPath("/api/admin/photos"), (route) => {
    route.fulfill({ json: pagedQueueItems(route.request().url(), adminPhotoList) });
  });
  await page.route(apiListPath("/api/admin/reports"), (route) => {
    route.fulfill({ json: pagedQueueItems(route.request().url(), adminReportList) });
  });
}
