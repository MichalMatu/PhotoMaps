import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { adminPlaces, nadodrzeCover, rynekCover } from "../fixtures/visualData";
import { ADMIN_TOKEN, API_URL } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

async function unlockAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();
  await expect(page.getByRole("navigation", { name: "Sekcje panelu admina" })).toBeVisible();
}

test("photo albums ignore stale responses after a fast status change", async ({ page }) => {
  const pendingPhoto = { ...rynekCover, approved_at: null, status: "pending" as const };
  const rejectedPhoto = { ...nadodrzeCover, approved_at: null, status: "rejected" as const };
  let pendingRequests = 0;
  let rejectedRequests = 0;

  await mockAdminApi(page, { adminPhotoList: [pendingPhoto, rejectedPhoto] });
  await page.route(`${API_URL}/api/admin/photos/albums**`, async (route) => {
    const status = new URL(route.request().url()).searchParams.get("status");
    if (status === "pending") {
      pendingRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({
        json: [{ cover_photo: pendingPhoto, photo_count: 1, place_id: pendingPhoto.place_id }],
      });
      return;
    }
    if (status === "rejected") {
      rejectedRequests += 1;
      await route.fulfill({
        json: [{ cover_photo: rejectedPhoto, photo_count: 1, place_id: rejectedPhoto.place_id }],
      });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await unlockAdmin(page);
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Moderacja/ })
    .click();
  await expect.poll(() => pendingRequests > 0).toBe(true);

  await page
    .getByRole("tablist", { name: "Status zdjęć" })
    .getByRole("tab", { name: /Odrzucone/ })
    .click();
  await expect.poll(() => rejectedRequests > 0).toBe(true);

  await page.getByRole("button", { name: /Pokaż media miasta Wrocław/ }).click();
  await expect(page.getByText(adminPlaces[1].title, { exact: true })).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.getByText(adminPlaces[1].title, { exact: true })).toBeVisible();
  await expect(page.getByText(adminPlaces[0].title, { exact: true })).toHaveCount(0);
});
