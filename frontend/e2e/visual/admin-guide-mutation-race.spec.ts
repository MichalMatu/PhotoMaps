import { expect, test } from "@playwright/test";

import { adminGuides, adminPlaces } from "../fixtures/visualData";
import { ADMIN_TOKEN, API_URL } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

test("guide mutation results do not overwrite a newly selected guide", async ({ page }) => {
  await mockAdminApi(page);

  let markMutationStarted: (() => void) | null = null;
  const mutationStarted = new Promise<void>((resolve) => {
    markMutationStarted = resolve;
  });
  const staleMutationPlace = {
    ...adminPlaces[0],
    id: "stale-guide-mutation-place",
    title: "Stale guide mutation result",
  };

  await page.route(`${API_URL}/api/admin/guides/${adminGuides[0].id}/places/*`, async (route) => {
    if (route.request().method() !== "DELETE") {
      await route.fallback();
      return;
    }

    markMutationStarted?.();
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({
      json: {
        ...adminGuides[0],
        places: [staleMutationPlace],
      },
    });
  });

  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();
  await expect(page.getByRole("navigation", { name: "Sekcje panelu admina" })).toBeVisible();
  await page.getByRole("navigation", { name: "Sekcje panelu admina" }).getByRole("button", { name: /Trasy/ }).click();

  const firstGuideRow = page.locator(".guide-row").filter({ hasText: adminGuides[0].title });
  const secondGuideRow = page.locator(".guide-row").filter({ hasText: adminGuides[1].title });

  await firstGuideRow.getByRole("button", { name: `Pokaż miejsca ${adminGuides[0].title}` }).click();
  const firstGuidePlaces = firstGuideRow.locator(".guide-place-list .guide-place-row");
  await expect(firstGuidePlaces).toHaveCount(adminGuides[0].preview_places.length);

  await firstGuidePlaces.first().getByRole("button", { name: "Usuń" }).click();
  await mutationStarted;

  await secondGuideRow.getByRole("button", { name: `Pokaż miejsca ${adminGuides[1].title}` }).click();
  const secondGuidePlaces = secondGuideRow.locator(".guide-place-list .guide-place-row-title");
  const expectedSecondGuideTitles = adminGuides[1].preview_places.map((place) => place.title);
  await expect(secondGuidePlaces).toHaveText(expectedSecondGuideTitles);

  await page.waitForTimeout(700);
  await expect(secondGuidePlaces).toHaveText(expectedSecondGuideTitles);
  await expect(secondGuideRow.locator(".guide-place-list")).not.toContainText(staleMutationPlace.title);
});
