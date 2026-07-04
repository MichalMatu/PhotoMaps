import { expect, test } from "@playwright/test";

import { wideGuideList } from "../fixtures/visualData";
import { API_URL } from "../support/config";
import { guideCardRows, hasHorizontalOverflow } from "../support/visualLayout";
import { mockSharedApi } from "../support/visualApi";

test("visual: guides list and detail", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1536 });
  await mockSharedApi(page);
  await page.goto("/guides");
  await expect(page.locator(".guide-card")).toHaveCount(3);
  await expect(page.locator(".guide-card.ui-card")).toHaveCount(3);
  expect((await guideCardRows(page)).map((row) => row.count)).toEqual([3]);
  const guideCardMediaMetrics = await page.locator(".guide-card").evaluateAll((cards) =>
    cards.map((card) => {
      const media = card.querySelector(".guide-card-media")?.getBoundingClientRect();
      const count = card.querySelector(".guide-card-count")?.getBoundingClientRect();
      return {
        countCenterOffset: Math.round((media?.bottom ?? 0) - ((count?.top ?? 0) + (count?.height ?? 0) / 2)),
        mediaBottom: Math.round(media?.bottom ?? 0),
        mediaWidth: Math.round(media?.width ?? 0),
      };
    }),
  );
  const [firstMediaMetric] = guideCardMediaMetrics;
  expect(guideCardMediaMetrics.every((metric) => metric.mediaWidth === firstMediaMetric.mediaWidth)).toBe(true);
  expect(guideCardMediaMetrics.every((metric) => metric.mediaBottom === firstMediaMetric.mediaBottom)).toBe(true);
  expect(guideCardMediaMetrics.map((metric) => metric.countCenterOffset)).toEqual([0, 0, 0]);

  await page.setViewportSize({ height: 820, width: 1920 });
  await page.unroute(`${API_URL}/api/guides`);
  await page.route(`${API_URL}/api/guides`, (route) => route.fulfill({ json: wideGuideList }));
  await page.goto("/guides");
  await expect(page.locator(".guide-card")).toHaveCount(6);
  const wideRows = await guideCardRows(page);
  expect(wideRows.reduce((count, row) => count + row.count, 0)).toBe(6);
  expect(wideRows.length).toBeGreaterThanOrEqual(2);
  expect(wideRows[0].count).toBeGreaterThan(wideRows[1].count);
  expect(wideRows[0].count).toBeGreaterThanOrEqual(4);
  expect(Math.abs(wideRows[1].left - wideRows[0].left)).toBeLessThanOrEqual(1);
  expect(wideRows[1].right).toBeLessThan(wideRows[0].right);
  expect(await hasHorizontalOverflow(page)).toBe(false);

  await page.setViewportSize({ height: 820, width: 1280 });
  await page.goto("/guides/wizualny-spacer");
  await expect(page.locator(".guide-place-card")).toHaveCount(2);
  await expect(page.locator(".guide-place-card.ui-card")).toHaveCount(2);
  const guideNavGap = await page.evaluate(() => {
    const menu = document.querySelector(".shell-menu-button")?.getBoundingClientRect();
    const link = document.querySelector(".guide-detail-view > .ghost-link")?.getBoundingClientRect();
    return Math.round((link?.left ?? 0) - (menu?.right ?? 0));
  });
  expect(guideNavGap).toBeGreaterThanOrEqual(40);
  await expect(page.locator(".guide-route-map")).toBeVisible();
  await expect(page.locator(".guide-route-map .leaflet-marker-icon")).toHaveCount(2);
  await expect(page.locator(".guide-route-line")).toHaveCount(1);
  await expect(page.locator(".guide-detail-hero .guide-card-media img")).toHaveCount(0);
  const googleMapsLink = page.getByRole("link", { name: "Pokaż w Google Maps" });
  await expect(googleMapsLink).toBeVisible();
  await expect(googleMapsLink).toHaveAttribute("target", "_blank");
  await expect(googleMapsLink).toHaveAttribute("rel", "noreferrer noopener");
  const googleMapsUrl = new URL((await googleMapsLink.getAttribute("href")) ?? "");
  expect(googleMapsUrl.origin).toBe("https://www.google.com");
  expect(googleMapsUrl.pathname).toBe("/maps/dir/");
  expect(googleMapsUrl.searchParams.get("origin")).toBe("51.1097,17.0325");
  expect(googleMapsUrl.searchParams.get("destination")).toBe("51.1208,17.0332");
  expect(googleMapsUrl.searchParams.get("waypoints")).toBeNull();
  expect(googleMapsUrl.searchParams.get("travelmode")).toBe("walking");
  expect(await hasHorizontalOverflow(page)).toBe(false);
  const routeMapMetrics = await page.locator(".guide-route-map").evaluate((map) => {
    const rect = map.getBoundingClientRect();
    return {
      height: Math.round(rect.height),
      width: Math.round(rect.width),
    };
  });
  expect(routeMapMetrics.width).toBeGreaterThan(420);
  expect(routeMapMetrics.height).toBeGreaterThan(240);
});
