import { expect, test, type Page } from "@playwright/test";

import type { AdminMemory, AdminPhoto } from "../../src/api/types";
import { adminPlaces, rynekCover, rynekMemory } from "../fixtures/visualData";
import { ADMIN_TOKEN, API_URL } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

async function unlockAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();
  await expect(page.getByRole("navigation", { name: "Sekcje panelu admina" })).toBeVisible();
}

async function openModeration(page: Page, sectionName: RegExp) {
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Moderacja/ })
    .click();
  await page.getByRole("tablist", { name: "Sekcje moderacji" }).getByRole("tab", { name: sectionName }).click();
  await page.getByRole("button", { name: /Pokaż media miasta Wrocław/ }).click();
  await page.getByRole("button", { name: `Pokaż media miejsca ${adminPlaces[0].title}` }).click();
}

function pendingMemory(id: string, caption: string): AdminMemory {
  return {
    ...rynekMemory,
    admin_audio: null,
    admin_public_path: `/api/admin/memories/${id}/media/image`,
    admin_thumb_path: `/api/admin/memories/${id}/media/thumb`,
    approved_at: null,
    caption,
    id,
    place_id: adminPlaces[0].id,
    share_slug: id,
    status: "pending",
  };
}

test("photo moderation locks competing decisions for one pending photo", async ({ page }) => {
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
  await openModeration(page, /Zdjęcia/);
  const item = page.locator(".admin-media-item").first();
  await expect(item).toContainText(pendingPhoto.caption ?? "");
  const approve = item.getByRole("button", { name: "Zatwierdź" });
  const reject = item.getByRole("button", { name: "Odrzuć" });

  await approve.click();
  await expect.poll(() => reviewRequests).toBe(1);
  await expect(approve).toBeDisabled();
  await expect(reject).toBeDisabled();
  await reject.evaluate((button: HTMLButtonElement) => button.click());
  await page.waitForTimeout(100);
  expect(reviewRequests).toBe(1);

  releaseReview();
  await expect.poll(() => reviewRequests).toBe(1);
});

test("memory moderation locks competing decisions for one pending memory", async ({ page }) => {
  const memory = pendingMemory("review-lock-memory", "Pamiątka do moderacji");
  let reviewRequests = 0;
  let releaseReview!: () => void;
  const reviewGate = new Promise<void>((resolve) => {
    releaseReview = resolve;
  });

  await mockAdminApi(page, { adminMemoryList: [memory], adminPlaceList: [adminPlaces[0]] });
  await page.route(`${API_URL}/api/admin/memories/${memory.id}/review`, async (route) => {
    reviewRequests += 1;
    await reviewGate;
    await route.fulfill({ json: { ...memory, status: "approved" } });
  });

  await unlockAdmin(page);
  await openModeration(page, /Pamiątki/);
  const item = page.locator(".admin-media-item").first();
  await expect(item).toContainText(memory.caption);
  const approve = item.getByRole("button", { name: "Zatwierdź" });
  const reject = item.getByRole("button", { name: "Odrzuć" });

  await approve.click();
  await expect.poll(() => reviewRequests).toBe(1);
  await expect(approve).toBeDisabled();
  await expect(reject).toBeDisabled();
  await reject.evaluate((button: HTMLButtonElement) => button.click());
  await page.waitForTimeout(100);
  expect(reviewRequests).toBe(1);

  releaseReview();
  await expect.poll(() => reviewRequests).toBe(1);
});

test("memory save blocks switching the editor until the request finishes", async ({ page }) => {
  const firstMemory = pendingMemory("save-lock-a", "Pierwsza pamiątka");
  const secondMemory = pendingMemory("save-lock-b", "Druga pamiątka");
  let saveRequests = 0;
  let releaseSave!: () => void;
  const saveGate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });

  await mockAdminApi(page, {
    adminMemoryList: [firstMemory, secondMemory],
    adminPlaceList: [adminPlaces[0]],
  });
  await page.route(`${API_URL}/api/admin/memories/${firstMemory.id}`, async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.continue();
      return;
    }
    saveRequests += 1;
    await saveGate;
    await route.fulfill({ json: firstMemory });
  });

  await unlockAdmin(page);
  await openModeration(page, /Pamiątki/);
  const items = page.locator(".admin-media-item");
  await expect(items).toHaveCount(2);
  const firstItem = items.nth(0);
  const secondItem = items.nth(1);
  await expect(firstItem).toContainText(firstMemory.caption);
  await expect(secondItem).toContainText(secondMemory.caption);

  await firstItem.getByRole("button", { name: "Edytuj pamiątkę" }).click();
  const saveButton = firstItem.getByRole("button", { name: "Zapisz" });
  const cancelButton = firstItem.getByRole("button", { name: "Anuluj" });
  const secondEditButton = secondItem.getByRole("button", { name: "Edytuj pamiątkę" });

  await saveButton.click();
  await expect.poll(() => saveRequests).toBe(1);
  await expect(cancelButton).toBeDisabled();
  await expect(secondEditButton).toBeDisabled();
  await secondEditButton.evaluate((button: HTMLButtonElement) => button.click());
  await page.waitForTimeout(100);
  await expect(firstItem.getByRole("button", { name: "Zapisywanie..." })).toBeDisabled();
  await expect(secondItem.getByRole("button", { name: "Edytuj pamiątkę" })).toBeDisabled();

  releaseSave();
  await expect.poll(() => saveRequests).toBe(1);
});
