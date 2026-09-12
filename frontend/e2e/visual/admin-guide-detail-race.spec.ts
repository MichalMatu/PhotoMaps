import { expect, test } from "@playwright/test";

import { adminGuides, adminPlaces } from "../fixtures/visualData";
import { ADMIN_TOKEN, API_URL } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

test("guide details ignore a stale response after switching guides", async ({ page }) => {
  await mockAdminApi(page);

  let markFirstRequestStarted: (() => void) | null = null;
  const firstRequestStarted = new Promise<void>((resolve) => {
    markFirstRequestStarted = resolve;
  });

  await page.route(`${API_URL}/api/admin/guides/*`, async (route) => {
    const guideId = route.request().url().split("/").pop();
    const guide = adminGuides.find((item) => item.id === guideId);
    if (!guide) {
      await route.fulfill({ json: { detail: "Guide not found" }, status: 404 });
      return;
    }

    if (guide.id === adminGuides[0].id) {
      markFirstRequestStarted?.();
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    await route.fulfill({
      json: {
        ...guide,
        places: guide.id === adminGuides[0].id ? [adminPlaces[0]] : [adminPlaces[1]],
      },
    });
  });

  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();
  await expect(page.getByRole("navigation", { name: "Sekcje panelu admina" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Trasy/ })
    .click();

  const firstGuideRow = page.locator(".guide-row").filter({ hasText: adminGuides[0].title });
  const secondGuideRow = page.locator(".guide-row").filter({ hasText: adminGuides[1].title });

  await firstGuideRow.getByRole("button", { name: `Pokaż miejsca ${adminGuides[0].title}` }).click();
  await firstRequestStarted;

  await secondGuideRow.getByRole("button", { name: `Pokaż miejsca ${adminGuides[1].title}` }).click();
  const secondGuidePlaces = secondGuideRow.locator(".guide-place-list .guide-place-row-title");
  await expect(secondGuidePlaces).toHaveText([adminPlaces[1].title]);

  await page.waitForTimeout(700);
  await expect(secondGuidePlaces).toHaveText([adminPlaces[1].title]);
  await expect(secondGuideRow.locator(".guide-place-list")).not.toContainText(adminPlaces[0].title);
});
