import { expect, test, type Page } from "@playwright/test";

import { mockSharedApi } from "../support/visualApi";

async function markerWidth(page: Page) {
  const box = await page.locator(".place-photo-marker").first().boundingBox();
  if (!box) {
    throw new Error("Map marker is not visible.");
  }
  return box.width;
}

async function dispatchPinch(page: Page, deltaY: number) {
  const map = page.locator(".place-map");
  const box = await map.boundingBox();
  if (!box) {
    throw new Error("Map is not visible.");
  }

  await map.dispatchEvent("wheel", {
    bubbles: true,
    cancelable: true,
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
    ctrlKey: true,
    deltaMode: 0,
    deltaY,
  });
}

test("Mac-style trackpad pinch zoom is gradual and rate limited", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);
  await page.goto("/");
  await expect(page.locator(".place-photo-marker").first()).toBeVisible();

  const initialWidth = await markerWidth(page);
  for (let index = 0; index < 4; index += 1) {
    await dispatchPinch(page, -12);
  }

  await expect.poll(() => markerWidth(page)).toBeGreaterThan(initialWidth);
  const afterGradualPinch = await markerWidth(page);

  await dispatchPinch(page, -600);
  await page.waitForTimeout(25);
  expect(Math.abs((await markerWidth(page)) - afterGradualPinch)).toBeLessThan(1);

  await page.waitForTimeout(70);
  await dispatchPinch(page, -1);
  await expect.poll(() => markerWidth(page)).toBeGreaterThan(afterGradualPinch);
});
