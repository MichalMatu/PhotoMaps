import { expect, type Page, test } from "@playwright/test";

import { ADMIN_TOKEN } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

async function routeEditorZoom(page: Page) {
  const zoom = await page.locator(".guide-route-editor-map .leaflet-tile-loaded").evaluateAll((tiles) => {
    const zoomLevels = tiles
      .map((tile) => {
        const match = (tile as HTMLImageElement).src.match(/\/(\d+)\/-?\d+\/-?\d+\.png(?:\?|$)/);
        return match ? Number(match[1]) : null;
      })
      .filter((value): value is number => value !== null);

    return zoomLevels.length > 0 ? Math.max(...zoomLevels) : null;
  });

  if (zoom === null) {
    throw new Error("Route editor zoom could not be read from loaded map tiles.");
  }
  return zoom;
}

async function waitForRouteEditorZoom(page: Page, expectedZoom: number) {
  await expect.poll(() => routeEditorZoom(page)).toBe(expectedZoom);
}

test("admin route editor preserves zoom while adding and moving route points", async ({ page }) => {
  await page.setViewportSize({ height: 920, width: 1360 });
  await mockAdminApi(page);
  await page.goto("/");
  await page.evaluate((token) => window.sessionStorage.setItem("photomaps_admin_token", token), ADMIN_TOKEN);
  await page.goto("/admin");

  await page.getByRole("navigation", { name: "Sekcje panelu admina" }).getByRole("button", { name: /Trasy/ }).click();
  await page.getByRole("button", { name: "Edytuj trasę Wizualny spacer po centrum" }).click();

  const dialog = page.getByRole("dialog", { name: "Edytuj trasę" });
  const map = dialog.locator(".guide-route-editor-map");
  await expect(map).toBeVisible();
  await expect(map.locator(".leaflet-tile-loaded").first()).toBeVisible();

  const initialZoom = await routeEditorZoom(page);
  await map.locator(".leaflet-control-zoom-in").click();
  await map.locator(".leaflet-control-zoom-in").click();
  await expect.poll(() => routeEditorZoom(page)).toBeGreaterThan(initialZoom);
  await expect.poll(() => routeEditorZoom(page)).toBeGreaterThanOrEqual(initialZoom + 2);

  const zoomBeforeAdd = await routeEditorZoom(page);
  const mapBox = await map.boundingBox();
  if (!mapBox) {
    throw new Error("Route editor map is not visible.");
  }
  await page.mouse.click(mapBox.x + mapBox.width * 0.7, mapBox.y + mapBox.height * 0.62);
  await expect(dialog.getByText("4 punktów")).toBeVisible();
  await waitForRouteEditorZoom(page, zoomBeforeAdd);

  const zoomBeforeDrag = await routeEditorZoom(page);
  const firstMarkerBox = await map.locator(".guide-route-editor-marker").first().boundingBox();
  if (!firstMarkerBox) {
    throw new Error("Route editor marker is not visible.");
  }
  await page.mouse.move(firstMarkerBox.x + firstMarkerBox.width / 2, firstMarkerBox.y + firstMarkerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    firstMarkerBox.x + firstMarkerBox.width / 2 + 42,
    firstMarkerBox.y + firstMarkerBox.height / 2 + 24,
    {
      steps: 5,
    },
  );
  await page.mouse.up();
  await waitForRouteEditorZoom(page, zoomBeforeDrag);
});
