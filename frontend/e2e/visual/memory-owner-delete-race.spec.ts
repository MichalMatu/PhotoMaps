import { expect, test } from "@playwright/test";

import { places, rynekMemory } from "../fixtures/visualData";
import { API_URL } from "../support/config";
import { clickMapMarker } from "../support/mapInteractions";
import { mockSharedApi } from "../support/visualApi";

test("memory owner modal stays locked until delete finishes", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);

  const memoryUrl = `${API_URL}/api/places/${places[0].id}/memories/${rynekMemory.id}`;
  let releaseDelete: (() => void) | undefined;
  const deleteGate = new Promise<void>((resolve) => {
    releaseDelete = resolve;
  });

  await page.route(`${memoryUrl}/claim`, (route) => route.fulfill({ json: { can_edit: true } }));
  await page.route(memoryUrl, async (route) => {
    if (route.request().method() !== "DELETE") {
      await route.fallback();
      return;
    }

    await deleteGate;
    await route.fulfill({ status: 204 });
  });

  await page.goto("/");
  await clickMapMarker(page, places[0].title);
  await page.locator(`[title="${rynekMemory.caption}"] span`).click();

  const detail = page.getByRole("dialog", { name: places[0].title });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Edytuj" }).click();

  const unlockOwner = page.getByRole("dialog", { name: "Odblokuj edycję pamiątki" });
  await unlockOwner.getByLabel("Token pamiątki").fill("probe-token-123");
  await unlockOwner.getByRole("button", { name: "Odblokuj" }).click();

  const editOwner = page.getByRole("dialog", { name: "Edytuj pamiątkę" });
  await expect(editOwner).toBeVisible();
  const deleteRequest = page.waitForRequest(
    (request) => request.url() === memoryUrl && request.method() === "DELETE",
  );
  await editOwner.getByRole("button", { name: "Usuń" }).click();
  await deleteRequest;

  const closeOwner = editOwner.getByRole("button", { name: "Zamknij modal" });
  await expect(closeOwner).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(editOwner).toBeVisible();

  releaseDelete?.();
  await expect(editOwner).toHaveCount(0);
  await expect(detail).toHaveCount(0);
});
