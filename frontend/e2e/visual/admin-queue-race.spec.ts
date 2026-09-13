import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import type { AdminMemory } from "../../src/api/types";
import { adminPlaces, rynekMemory } from "../fixtures/visualData";
import { ADMIN_TOKEN, API_URL } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

async function unlockAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();
  await expect(page.getByRole("navigation", { name: "Sekcje panelu admina" })).toBeVisible();
}

test("memory queue ignores a stale response after a fast status change", async ({ page }) => {
  const pendingMemory: AdminMemory = {
    ...rynekMemory,
    admin_audio: null,
    admin_public_path: "/api/admin/memories/pending-memory/media/image",
    admin_thumb_path: "/api/admin/memories/pending-memory/media/thumb",
    approved_at: null,
    id: "pending-memory",
    place_id: adminPlaces[0].id,
    share_slug: "pending-memory",
    status: "pending",
  };
  const rejectedMemory: AdminMemory = {
    ...pendingMemory,
    admin_public_path: "/api/admin/memories/rejected-memory/media/image",
    admin_thumb_path: "/api/admin/memories/rejected-memory/media/thumb",
    caption: "Odrzucona pamiątka",
    id: "rejected-memory",
    place_id: adminPlaces[1].id,
    share_slug: "rejected-memory",
    status: "rejected",
  };
  let pendingRequests = 0;
  let rejectedRequests = 0;

  await mockAdminApi(page, { adminMemoryList: [pendingMemory, rejectedMemory] });
  await page.route(`${API_URL}/api/admin/memories**`, async (route) => {
    const status = new URL(route.request().url()).searchParams.get("status");
    if (status === "pending") {
      pendingRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({ json: [pendingMemory] });
      return;
    }
    if (status === "rejected") {
      rejectedRequests += 1;
      await route.fulfill({ json: [rejectedMemory] });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await unlockAdmin(page);
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Moderacja/ })
    .click();
  await page
    .getByRole("tablist", { name: "Sekcje moderacji" })
    .getByRole("tab", { name: /Pamiątki/ })
    .click();
  await expect.poll(() => pendingRequests > 0).toBe(true);

  await page
    .getByRole("tablist", { name: "Status pamiątek" })
    .getByRole("tab", { name: /Odrzucone/ })
    .click();
  await expect.poll(() => rejectedRequests > 0).toBe(true);

  const cityToggle = page.getByRole("button", { name: /Pokaż media miasta Wrocław/ });
  await expect(cityToggle).toBeVisible();
  await cityToggle.click();
  await expect(page.getByText(adminPlaces[1].title, { exact: true })).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.getByText(adminPlaces[1].title, { exact: true })).toBeVisible();
  await expect(page.getByText(adminPlaces[0].title, { exact: true })).toHaveCount(0);
});
