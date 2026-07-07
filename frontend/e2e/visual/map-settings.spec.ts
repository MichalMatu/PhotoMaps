import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import type { AppConfig, City, PlaceMapItem } from "../../src/api/types";
import { appConfig, city, places } from "../fixtures/visualData";
import { API_URL } from "../support/config";
import { mockSharedApi } from "../support/visualApi";

const baseAppConfig = appConfig as AppConfig;
const baseCity = city as City;

function place(index: number, overrides: Partial<PlaceMapItem> = {}): PlaceMapItem {
  const basePlace = places[index % places.length] as PlaceMapItem;
  const placeCity = overrides.city ?? baseCity;

  return {
    ...basePlace,
    city: placeCity,
    city_id: placeCity.id,
    id: `settings-place-${index}`,
    lat: placeCity.lat + (index % 5) * 0.001,
    lon: placeCity.lon + Math.floor(index / 5) * 0.001,
    score: 10 - index * 0.1,
    slug: `settings-place-${index}`,
    title: `Ustawienia mapy ${index + 1}`,
    weight: index === 0 ? 5 : 1,
    ...overrides,
  };
}

function manyPlaces(count: number, placeCity: City = baseCity) {
  return Array.from({ length: count }, (_item, index) => place(index, { city: placeCity }));
}

async function mockAppConfig(page: Page, config: AppConfig) {
  await page.route(`${API_URL}/api/app-config`, (route) => route.fulfill({ json: config }));
}

function tileRequestZoom(url: string) {
  const match = new URL(url).pathname.match(/^\/(\d+)\/\d+\/\d+\.png$/);
  return match ? Number(match[1]) : null;
}

function expectedTileForCenter({ lat, lon, zoom }: { lat: number; lon: number; zoom: number }) {
  const scale = 2 ** zoom;
  const latRadians = (lat * Math.PI) / 180;

  return {
    x: Math.floor(((lon + 180) / 360) * scale),
    y: Math.floor(((1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) / 2) * scale),
  };
}

async function loadedTilePaths(page: Page) {
  return page.locator(".leaflet-tile").evaluateAll((tiles) =>
    tiles
      .map((tile) => (tile instanceof HTMLImageElement ? tile.src : ""))
      .filter((src) => src.length > 0)
      .map((src) => new URL(src).pathname),
  );
}

function parseTilePath(path: string) {
  const match = path.match(/^\/(\d+)\/(\d+)\/(\d+)\.png$/);
  if (!match) {
    return null;
  }

  return {
    x: Number(match[2]),
    y: Number(match[3]),
    zoom: Number(match[1]),
  };
}

test("map start settings control the initial public viewport", async ({ page }) => {
  const start = {
    lat: 50.0647,
    lon: 19.945,
    zoom: 12,
  };
  const tileRequests: string[] = [];
  const tunedConfig: AppConfig = {
    ...baseAppConfig,
    map: {
      ...baseAppConfig.map,
      fallback_center: {
        lat: start.lat,
        lon: start.lon,
      },
      fallback_zoom: start.zoom,
    },
  };

  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page, [place(0), place(1)]);
  await mockAppConfig(page, tunedConfig);
  page.on("request", (request) => {
    if (request.url().includes(".tile.openstreetmap.org/")) {
      tileRequests.push(request.url());
    }
  });
  await page.goto("/");

  await expect
    .poll(async () => tileRequests.map(tileRequestZoom).filter((zoom) => zoom !== null))
    .toContain(start.zoom);
  const expectedCenterTile = expectedTileForCenter(start);
  await expect
    .poll(async () =>
      (await loadedTilePaths(page))
        .map(parseTilePath)
        .some(
          (tile) =>
            tile?.zoom === start.zoom &&
            Math.abs(tile.x - expectedCenterTile.x) <= 2 &&
            Math.abs(tile.y - expectedCenterTile.y) <= 2,
        ),
    )
    .toBe(true);
});

test("map settings control rendered marker tile sizes", async ({ page }) => {
  const mapPlaces = [place(0), place(1)];
  const tunedConfig: AppConfig = {
    ...baseAppConfig,
    map: {
      ...baseAppConfig.map,
      marker_scale: {
        base_size: {
          height: 78,
          width: 104,
        },
        max_render_scale: 2.25,
        min_render_scale: 0.5,
        priority: {
          curve: 0.75,
          max_scale: 2.05,
          min_scale: 0.55,
        },
      },
    },
  };

  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page, mapPlaces);
  await mockAppConfig(page, tunedConfig);
  await page.goto("/");

  const highPriorityTile = page.locator(`[title="${mapPlaces[0].title}"] span`);
  const normalPriorityTile = page.locator(`[title="${mapPlaces[1].title}"] span`);
  await expect(highPriorityTile).toBeVisible();
  await expect(normalPriorityTile).toBeVisible();

  const highPriorityBox = await highPriorityTile.boundingBox();
  const normalPriorityBox = await normalPriorityTile.boundingBox();

  expect(highPriorityBox?.width).toBeGreaterThan(180);
  expect(highPriorityBox?.height).toBeGreaterThan(135);
  expect(highPriorityBox?.width).toBeGreaterThan((normalPriorityBox?.width ?? 0) * 2);
});

test("map settings control visible marker density", async ({ page }) => {
  const mapPlaces = manyPlaces(40);
  const sparseConfig: AppConfig = {
    ...baseAppConfig,
    map: {
      ...baseAppConfig.map,
      marker_density: {
        full_density_zoom: 15,
        marker_viewport_area: 60_000,
        max_zoom_fill_ratio: 0.5,
        min_zoom: 6,
        min_zoom_fill_ratio: 0.05,
        zoom_curve: 1.8,
      },
    },
  };

  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page, mapPlaces);
  await mockAppConfig(page, sparseConfig);
  await page.goto("/");

  await expect.poll(async () => page.locator(".place-photo-marker").count()).toBeGreaterThan(0);
  await expect(page.locator(".place-photo-marker")).toHaveCount(3);
});
