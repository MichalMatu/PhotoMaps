import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { adminPlaces, city, nadodrzeCover, rynekCover, rynekSide } from "../fixtures/visualData";
import { ADMIN_TOKEN, API_URL } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

async function unlockAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();
  await expect(page.getByRole("navigation", { name: "Sekcje panelu admina" })).toBeVisible();
}

test("place photo preview ignores a stale refresh after switching places", async ({ page }) => {
  let rynekPhotoRequests = 0;

  await mockAdminApi(page, { adminPhotoList: [rynekCover, rynekSide, nadodrzeCover] });
  await page.route(`${API_URL}/api/admin/places/${adminPlaces[0].id}/photos`, async (route) => {
    rynekPhotoRequests += 1;
    if (rynekPhotoRequests === 1) {
      await route.fulfill({ json: [rynekCover, rynekSide] });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ json: [{ ...rynekCover, caption: "STALE RYNEK RESPONSE" }] });
  });
  await page.route(`${API_URL}/api/admin/places/${adminPlaces[1].id}/photos`, (route) =>
    route.fulfill({ json: [{ ...nadodrzeCover, caption: "CURRENT NADODRZE RESPONSE" }] }),
  );
  await page.route(`${API_URL}/api/admin/photos/${rynekSide.id}/cover`, (route) =>
    route.fulfill({ json: { ...adminPlaces[0], cover_photo_id: rynekSide.id } }),
  );

  await unlockAdmin(page);
  const cityToggle = page.locator(".place-city-toggle").filter({ hasText: city.name });
  await cityToggle.click();

  const rynekRow = page.locator(".place-city-group .table-row").filter({ hasText: adminPlaces[0].title });
  await rynekRow.getByRole("button", { name: `Galeria zdjęć miejsca ${adminPlaces[0].title}` }).click();
  const photoDialog = page.getByRole("dialog", { name: "Zdjęcia miejsca" });
  await expect(photoDialog).toBeVisible();
  const rynekSideCard = photoDialog.locator(".admin-media-item").filter({ hasText: rynekSide.caption });
  await rynekSideCard.getByRole("button", { name: "Ustaw jako główne" }).click();
  await expect.poll(() => rynekPhotoRequests >= 2).toBe(true);

  await photoDialog.getByRole("button", { name: "Zamknij modal" }).click();
  await expect(photoDialog).not.toBeVisible();

  const nadodrzeRow = page.locator(".place-city-group .table-row").filter({ hasText: adminPlaces[1].title });
  await nadodrzeRow.getByRole("button", { name: `Galeria zdjęć miejsca ${adminPlaces[1].title}` }).click();
  const nadodrzeDialog = page.getByRole("dialog", { name: "Zdjęcia miejsca" });
  await expect(nadodrzeDialog.getByText("CURRENT NADODRZE RESPONSE")).toBeVisible();

  await page.waitForTimeout(700);
  await expect(nadodrzeDialog.getByText("CURRENT NADODRZE RESPONSE")).toBeVisible();
  await expect(nadodrzeDialog.getByText("STALE RYNEK RESPONSE")).toHaveCount(0);
});
