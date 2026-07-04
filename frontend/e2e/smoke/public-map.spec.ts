import { expect, test } from "@playwright/test";

import { clickMapMarker } from "../support/mapInteractions";
import { expectAnimationName, expectExitPhase } from "../support/motionAssertions";
import { createCategory, createPlace, uploadApprovedPhoto } from "../support/smokeApi";

test("public map loads without API error", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".map-frame")).toBeVisible();
  await expect(page.getByText("Nie udało się pobrać miejsc")).toHaveCount(0);
});

test("map motion states animate media modal and sheets", async ({ page, request }) => {
  const suffix = `${Date.now()}-${test.info().workerIndex}`;
  const photoCaption = `Zdjęcie motion ${suffix}`;
  const category = await createCategory(request, suffix);
  const place = await createPlace(request, category.id, suffix, {
    lat: 51.101,
    lon: 17.055,
    title: `E2E motion ${suffix}`,
  });
  await uploadApprovedPhoto(request, place.id, photoCaption);

  await page.goto("/");
  await expect(page.locator(".map-frame")).toBeVisible();
  await clickMapMarker(page, place.title);
  await clickMapMarker(page, photoCaption);

  const detailDialog = page.getByRole("dialog", { name: place.title });
  const detailBackdrop = detailDialog.locator("..");
  await expect(detailDialog).toBeVisible();
  await expectAnimationName(detailBackdrop, "system-modal-backdrop-in");
  await expectAnimationName(detailDialog, "system-modal-in");

  await page.keyboard.press("Escape");
  await expectExitPhase(detailDialog);
  await expect(detailDialog).toBeHidden();

  await clickMapMarker(page, photoCaption);
  await expect(detailDialog).toBeVisible();

  await detailDialog.getByRole("button", { name: "Zgłoś problem" }).click();
  const reportDialog = page.getByRole("dialog", { name: "Zgłoś problem" });
  const reportBackdrop = reportDialog.locator("..");
  await expect(reportDialog).toBeVisible();
  await expectAnimationName(reportBackdrop, "system-modal-backdrop-in");
  await expectAnimationName(reportDialog, "system-modal-in");
  await reportDialog.getByRole("button", { name: "Zamknij modal" }).click();
  await expectExitPhase(reportDialog);
  await expect(reportDialog).toBeHidden();

  await page.keyboard.press("Escape");
  await expectExitPhase(detailDialog);
  await expect(detailDialog).toBeHidden();

  await clickMapMarker(page, `Byłem tutaj: ${place.title}`);
  const memoryDialog = page.getByRole("dialog", { name: "Byłem tutaj" });
  const memoryBackdrop = memoryDialog.locator("..");
  await expect(memoryDialog).toBeVisible();
  await expectAnimationName(memoryBackdrop, "system-modal-backdrop-in");
  await expectAnimationName(memoryDialog, "system-modal-in");
  await memoryDialog.getByRole("button", { name: "Zamknij modal" }).click();
  await expectExitPhase(memoryDialog);
  await expect(memoryDialog).toBeHidden();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator(".map-frame")).toBeVisible();
  await clickMapMarker(page, place.title);
  await clickMapMarker(page, photoCaption);
  const reducedDetail = page.getByRole("dialog", { name: place.title });
  await expect(reducedDetail).toBeVisible();
  await expectAnimationName(reducedDetail, "system-modal-reduced-in");
  await page.keyboard.press("Escape");
  await expect(reducedDetail).toBeHidden();

  await clickMapMarker(page, `Byłem tutaj: ${place.title}`);
  const reducedMemoryDialog = page.getByRole("dialog", { name: "Byłem tutaj" });
  await expect(reducedMemoryDialog).toBeVisible();
  await expectAnimationName(reducedMemoryDialog, "system-modal-reduced-in");
});
