import { expect, test } from "@playwright/test";

import { PHOTO_BUFFER } from "../fixtures/media";
import { places } from "../fixtures/visualData";
import { API_URL } from "../support/config";
import { clickMapMarker } from "../support/mapInteractions";
import { mockSharedApi } from "../support/visualApi";

test("memory form freezes its draft and ignores duplicate submit events", async ({ page }) => {
  const place = places[0];
  let uploadRequests = 0;
  let releaseUpload!: () => void;
  const uploadGate = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });

  await mockSharedApi(page);
  await page.route(`${API_URL}/api/places/${place.id}/memories`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fulfill({ json: [] });
      return;
    }

    uploadRequests += 1;
    await uploadGate;
    await route.fulfill({
      json: {
        author_city: "Wrocław",
        author_name: "Marta",
        caption: "Pamiątka testowa",
        created_at: "2026-09-13T00:00:00Z",
        id: "memory-submit-lock",
        memory_text: "Treść wspomnienia",
        place_id: place.id,
        status: "pending",
      },
      status: 201,
    });
  });

  await page.goto("/");
  await clickMapMarker(page, place.title);
  await clickMapMarker(page, `Byłem tutaj: ${place.title}`);

  const dialog = page.getByRole("dialog", { name: "Byłem tutaj" });
  await dialog.getByPlaceholder("Wpisz token").fill("token-123456");
  await dialog.getByLabel("Zdjęcie pamiątki").setInputFiles({
    buffer: PHOTO_BUFFER,
    mimeType: "image/jpeg",
    name: "memory.jpg",
  });
  await dialog.getByLabel("Podpis").fill("Pamiątka testowa");
  await dialog.getByLabel("Myśl / wspomnienie").fill("Treść wspomnienia");
  await dialog.getByLabel("Imię").fill("Marta");
  await dialog.getByLabel("Miasto").fill("Wrocław");
  await dialog.locator('input[type="checkbox"]').check();

  const form = dialog.locator("form.photo-upload");
  await form.evaluate((element: HTMLFormElement) => {
    element.requestSubmit();
    element.requestSubmit();
  });

  await expect.poll(() => uploadRequests).toBe(1);
  await expect(dialog.getByLabel("Zdjęcie pamiątki")).toBeDisabled();
  await expect(dialog.getByLabel("Podpis")).toBeDisabled();
  await expect(dialog.getByLabel("Myśl / wspomnienie")).toBeDisabled();
  await expect(dialog.locator('input[type="checkbox"]')).toBeDisabled();

  releaseUpload();
  await expect.poll(() => uploadRequests).toBe(1);
});
