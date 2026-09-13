import { expect, test, type Page } from "@playwright/test";

import type { AdminPhoto } from "../../src/api/types";
import { adminPlaces, rynekCover, rynekSide } from "../fixtures/visualData";
import { ADMIN_TOKEN, API_URL } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

async function unlockAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();
  await expect(page.getByRole("navigation", { name: "Sekcje panelu admina" })).toBeVisible();
}

async function openPhotoModeration(page: Page, placeTitle: string) {
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Moderacja/ })
    .click();
  await page.getByRole("tablist", { name: "Sekcje moderacji" }).getByRole("tab", { name: /Zdjęcia/ }).click();
  await page.getByRole("button", { name: /Pokaż media miasta Wrocław/ }).click();
  await page.getByRole("button", { name: `Pokaż media miejsca ${placeTitle}` }).click();
}

test("photo moderation locks cover changes per place until the first request finishes", async ({ page }) => {
  const place = { ...adminPlaces[0], cover_photo_id: null };
  const firstPhoto: AdminPhoto = { ...rynekCover, status: "approved" };
  const secondPhoto: AdminPhoto = { ...rynekSide, status: "approved" };
  let coverRequests = 0;
  let releaseFirstCover!: () => void;
  const firstCoverGate = new Promise<void>((resolve) => {
    releaseFirstCover = resolve;
  });

  await mockAdminApi(page, { adminPhotoList: [firstPhoto, secondPhoto], adminPlaceList: [place] });
  await page.route(`${API_URL}/api/admin/places/${place.id}/photos**`, (route) =>
    route.fulfill({ json: [firstPhoto, secondPhoto] }),
  );
  await page.route(`${API_URL}/api/admin/photos/${firstPhoto.id}/cover`, async (route) => {
    coverRequests += 1;
    await firstCoverGate;
    await route.fulfill({ json: { ...place, cover_photo_id: firstPhoto.id } });
  });
  await page.route(`${API_URL}/api/admin/photos/${secondPhoto.id}/cover`, async (route) => {
    coverRequests += 1;
    await route.fulfill({ json: { ...place, cover_photo_id: secondPhoto.id } });
  });

  await unlockAdmin(page);
  await openPhotoModeration(page, place.title);

  const items = page.locator(".admin-media-item");
  await expect(items).toHaveCount(2);
  const firstItem = items.filter({ hasText: firstPhoto.caption ?? "" }).first();
  const secondItem = items.filter({ hasText: secondPhoto.caption ?? "" }).first();
  const firstCoverButton = firstItem.getByRole("button", { name: "Ustaw jako główne" });
  const secondCoverButton = secondItem.getByRole("button", { name: "Ustaw jako główne" });
  const firstCoverResponse = page.waitForResponse(
    (response) => response.url() === `${API_URL}/api/admin/photos/${firstPhoto.id}/cover`,
  );

  await firstCoverButton.click();
  await expect.poll(() => coverRequests).toBe(1);
  await expect(firstCoverButton).toBeDisabled();
  await expect(secondCoverButton).toBeDisabled();
  await secondCoverButton.evaluate((button: HTMLButtonElement) => button.click());
  await page.waitForTimeout(100);
  expect(coverRequests).toBe(1);

  releaseFirstCover();
  await firstCoverResponse;
  expect(coverRequests).toBe(1);
});
