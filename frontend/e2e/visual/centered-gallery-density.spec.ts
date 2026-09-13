import { expect, test } from "@playwright/test";

import { appConfig, city, places } from "../fixtures/visualData";
import { API_URL } from "../support/config";
import { clickMapMarker } from "../support/mapInteractions";
import { mockSharedApi } from "../support/visualApi";

test("clicked place gallery survives density reselection while centering", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  const probeCity = { ...city, default_zoom: 11 };
  const target = {
    ...places[0],
    city: probeCity,
    city_id: probeCity.id,
    id: "density-edge-target",
    lat: city.lat,
    lon: 17.44,
    score: 0,
    slug: "density-edge-target",
    title: "Density edge target",
    weight: 1,
  };
  const competitor = {
    ...places[0],
    city: probeCity,
    city_id: probeCity.id,
    id: "density-edge-competitor",
    lat: city.lat,
    lon: 17.55,
    score: 100,
    slug: "density-edge-competitor",
    title: "Density edge competitor",
    weight: 5,
  };

  await mockSharedApi(page, [target, competitor], undefined, [probeCity]);
  await page.route(`${API_URL}/api/app-config`, (route) =>
    route.fulfill({
      json: {
        ...appConfig,
        map: {
          ...appConfig.map,
          fallback_center: { lat: city.lat, lon: city.lon },
          fallback_zoom: 11,
        },
      },
    }),
  );
  await page.route(`${API_URL}/api/places/${target.id}/photos`, (route) => route.fulfill({ json: [] }));

  await page.goto("/");
  await expect(page.locator(`[title="${target.title}"]`)).toHaveCount(1);
  await expect(page.locator(`[title="${competitor.title}"]`)).toHaveCount(0);

  await clickMapMarker(page, target.title);

  await expect(page.locator(`[title="${competitor.title}"]`)).toHaveCount(1);
  await expect(page.locator(`.place-photo-marker.is-selected[title="${target.title}"]`)).toHaveCount(1);
  await expect(page.locator(".photo-gallery-marker")).toHaveCount(3);
});
