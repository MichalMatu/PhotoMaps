import { expect, test } from "@playwright/test";

import { places } from "../fixtures/visualData";
import { hasHorizontalOverflow } from "../support/visualLayout";
import { mockSharedApi } from "../support/visualApi";

test("visual: place article renders link blocks as compact links", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);
  await page.goto(`/places/${places[0].slug}`);
  await expect(page.locator(".place-detail-links")).toBeVisible();
  const placeNavGap = await page.evaluate(() => {
    const menu = document.querySelector(".shell-menu-button")?.getBoundingClientRect();
    const links = document.querySelector(".place-detail-links")?.getBoundingClientRect();
    return Math.round((links?.left ?? 0) - (menu?.right ?? 0));
  });
  expect(placeNavGap).toBeGreaterThanOrEqual(40);
  expect(await hasHorizontalOverflow(page)).toBe(false);

  const article = page.locator(".place-article");
  await expect(article.getByRole("heading", { level: 2, name: "Mały pasaż, duża zmiana rytmu" })).toBeVisible();
  const link = article.getByRole("link", { name: /Roger Molls - The Listener/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=aUPa4IyWNSo&list=RD6GljHsxfErk&index=27");
  await expect(article.getByRole("heading", { level: 2, name: /Roger Molls - The Listener/ })).toHaveCount(0);
});
