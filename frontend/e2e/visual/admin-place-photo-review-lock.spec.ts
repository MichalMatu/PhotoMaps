import { expect, test, type Page } from "@playwright/test";

import type { AdminPhoto } from "../../src/api/types";
import { PHOTO_BUFFER } from "../fixtures/media";
import { adminPlaces, city, rynekCover } from "../fixtures/visualData";
import { ADMIN_TOKEN, API_URL } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

async function unlockAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();
  await expect(page.getByRole("navigation", { name: "Sekcje panelu admina" })).toBeVisible();
}

async function openPlacePhotoPanel(page: Page) {
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
  return panel;
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

  const panel = await openPlacePhotoPanel(page);
  const card = panel
    .locator(".admin-media-item")
    .filter({ hasText: pendingPhoto.caption ?? "" })
    .first();
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

test("place photo upload freezes its draft and ignores duplicate submit events", async ({ page }) => {
  const uploadedPhoto: AdminPhoto = {
    ...rynekCover,
    approved_at: null,
    caption: "Nowe zdjęcie",
    id: "place-photo-upload-lock",
    status: "pending",
  };
  let uploadRequests = 0;
  let releaseUpload!: () => void;
  const uploadGate = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });

  await mockAdminApi(page, { adminPhotoList: [], adminPlaceList: [adminPlaces[0]] });
  await page.route(`${API_URL}/api/admin/places/${adminPlaces[0].id}/photos`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    uploadRequests += 1;
    await uploadGate;
    await route.fulfill({ json: uploadedPhoto });
  });
  await page.route(`${API_URL}/api/admin/photos/${uploadedPhoto.id}/review`, (route) =>
    route.fulfill({ json: { ...uploadedPhoto, approved_at: "2026-09-13T00:00:00Z", status: "approved" } }),
  );

  const panel = await openPlacePhotoPanel(page);
  await panel.getByRole("button", { name: `Dodaj zdjęcie do miejsca ${adminPlaces[0].title}` }).click();

  const uploadModal = page.getByRole("dialog", { name: "Dodaj zdjęcie" });
  const photoInput = uploadModal.locator("input#photo-upload-file");
  const captionInput = uploadModal.getByRole("textbox", { name: "Podpis", exact: true });
  const authorInput = uploadModal.getByRole("textbox", { name: "Autor", exact: true });
  await photoInput.setInputFiles({
    buffer: PHOTO_BUFFER,
    mimeType: "image/jpeg",
    name: "place-photo.jpg",
  });
  await captionInput.fill("Nowe zdjęcie");

  const form = uploadModal.locator("form#photo-upload-form-modal");
  await form.evaluate((element: HTMLFormElement) => {
    element.requestSubmit();
    element.requestSubmit();
  });

  await expect.poll(() => uploadRequests).toBe(1);
  await expect(photoInput).toBeDisabled();
  await expect(captionInput).toBeDisabled();
  await expect(authorInput).toBeDisabled();

  releaseUpload();
  await expect(uploadModal).toBeHidden();
  expect(uploadRequests).toBe(1);
});
