import { expect, test, type Page } from "@playwright/test";

import type { AdminPhoto } from "../../src/api/types";
import { adminPlaces, city, rynekCover } from "../fixtures/visualData";
import { ADMIN_TOKEN, API_URL } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

async function unlockAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();
  await expect(page.getByRole("navigation", { name: "Sekcje panelu admina" })).toBeVisible();
}

test("place photo panel locks competing review decisions for one photo", async ({ page }) => {
  const pendingPhoto: AdminPhoto = { ...rynekCover, approved_at: null, status: "pending" };
  let reviewRequests = 0;
  let releaseReview!: () => void;
  const reviewGate = new Promise<void>((resolve) => {
    releaseReview = resolve;
  });

  await mockAdminApi(page, { adminPhotoList: [pendingPhoto], adminPlaceList: [adminPlaces[0]] });
  await page.route(`${API_URL}/api/admin/photos/${pendingPhoto.id}/review`, async (route) => {
    reviewRequests += 1;
    await reviewGate;
    await route.fulfill({ json: { ...pendingPhoto, status: "approved" } });
  });

  await unlockAdmin(page);
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Miejsca/ })
    .click();
  await page.locator(".place-city-toggle").filter({ hasText: city.name }).click();
  const placeRow = page.locator(".place-city-group .table-row").filter({ hasText: adminPlaces[0].title });
  await placeRow.getByRole("button", { name: `Galeria zdjęć miejsca ${adminPlaces[0].title}` }).click();

  const panel = page.getByRole("dialog", { name: "Zdjęcia miejsca" });
  await expect(panel).toBeVisible();
  const card = panel.locator(".admin-media-item").filter({ hasText: pendingPhoto.caption ?? "" }).first();
  const approve = card.getByRole("button", { name: "Zatwierdź" });
  const reject = card.getByRole("button", { name: "Odrzuć" });

  await approve.click();
  await expect.poll(() => reviewRequests).toBe(1);
  await expect(approve).toBeDisabled();
  await expect(reject).toBeDisabled();
  await reject.evaluate((button: HTMLButtonElement) => button.click());
  await page.waitForTimeout(100);
  expect(reviewRequests).toBe(1);

  await card.getByRole("button", { name: `Otwórz galerię zdjęć miejsca ${adminPlaces[0].title}` }).click();
  const gallery = page.getByRole("dialog", { name: "Galeria zdjęć" });
  await expect(gallery.getByRole("button", { name: "Zatwierdź" })).toBeDisabled();
  await expect(gallery.getByRole("button", { name: "Odrzuć" })).toBeDisabled();

  releaseReview();
  await expect.poll(() => reviewRequests).toBe(1);
});
