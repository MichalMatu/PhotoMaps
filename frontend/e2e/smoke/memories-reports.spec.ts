import { expect, test } from "@playwright/test";

import { PHOTO_BUFFER } from "../fixtures/media";
import { openAdminModerationSection, openStatusTab, unlockAdmin } from "../support/adminUi";
import { clickMapMarker } from "../support/mapInteractions";
import { createCategory, createPlace, getMapPlaces, uploadApprovedPhoto } from "../support/smokeApi";

test("visitor can add a memory and admin can approve it through UI", async ({ page, request }) => {
  const suffix = `${Date.now()}-${test.info().workerIndex}`;
  const caption = `Pamiątka e2e ${suffix}`;
  const memoryText = `Wspomnienie e2e ${suffix}`;
  const claimToken = `token-${suffix}`;
  const authorName = "Marta";
  const authorCity = "Wrocław";
  const category = await createCategory(request, suffix);
  const place = await createPlace(request, category.id, suffix, {
    lat: 51.12,
    lon: 17.08,
    title: `E2E pamiątka ${suffix}`,
  });
  await uploadApprovedPhoto(request, place.id, `Cover e2e ${suffix}`);

  await page.goto("/");
  await expect(page.locator(".map-frame")).toBeVisible();
  await clickMapMarker(page, place.title);
  await clickMapMarker(page, `Byłem tutaj: ${place.title}`);

  const memoryDialog = page.getByRole("dialog", { name: "Byłem tutaj" });
  await expect(memoryDialog).toBeVisible();
  await memoryDialog.getByPlaceholder("Wpisz token").fill(claimToken);
  await memoryDialog.getByLabel("Zdjęcie pamiątki").setInputFiles({
    buffer: PHOTO_BUFFER,
    mimeType: "image/jpeg",
    name: "e2e-memory.jpg",
  });
  await memoryDialog.getByLabel("Podpis").fill(caption);
  await memoryDialog.getByLabel("Myśl / wspomnienie").fill(memoryText);
  await memoryDialog.getByLabel("Imię").fill(authorName);
  await memoryDialog.getByLabel("Miasto").fill(authorCity);
  await memoryDialog.locator('input[type="checkbox"]').check();
  await memoryDialog.getByRole("button", { name: "Dodaj pamiątkę" }).click();

  await expect(memoryDialog).toBeHidden();
  const thanksDialog = page.getByRole("dialog", { name: "Pamiątka trafiła do moderacji" });
  await expect(thanksDialog).toBeVisible();
  await thanksDialog.getByRole("button", { name: "OK" }).click();

  const adminTabs = await unlockAdmin(page);
  await openAdminModerationSection(page, adminTabs, /Pamiątki/);

  await openStatusTab(page, /Do sprawdzenia/);
  const pendingAlbum = page.locator(".admin-media-album-summary").filter({ hasText: place.title });
  await expect(pendingAlbum).toContainText("1 pamiątka");
  await pendingAlbum.click();

  const pendingItem = page.locator(".admin-media-item").filter({ hasText: caption });
  await expect(pendingItem).toContainText("do sprawdzenia");
  await expect(pendingItem).toContainText(memoryText);
  await expect(pendingItem).toContainText(authorName);
  await pendingItem.getByRole("button", { name: "Zatwierdź" }).click();
  await expect(pendingItem).toBeHidden();

  await expect
    .poll(async () => {
      const mapPlaces = await getMapPlaces(request, place.city_id);
      const mapPlace = mapPlaces.find((item) => item.id === place.id);
      const memory = mapPlace?.preview_items.find((item) => item.kind === "memory");
      return {
        memoryCaption: memory?.caption ?? null,
        memoryCount: mapPlace?.memory_count ?? 0,
      };
    })
    .toEqual({ memoryCaption: caption, memoryCount: 1 });

  await page.goto("/");
  await expect(page.locator(".map-frame")).toBeVisible();
  await clickMapMarker(page, place.title);
  await expect(page.locator(`[title="${caption}"]`)).toBeVisible();
});

test("visitor can report a photo and admin can inspect, close and delete the report through UI", async ({
  page,
  request,
}) => {
  const suffix = `${Date.now()}-${test.info().workerIndex}`;
  const photoCaption = `Zdjęcie do zgłoszenia ${suffix}`;
  const reportMessage = `Opis problemu e2e ${suffix}`;
  const category = await createCategory(request, suffix);
  const place = await createPlace(request, category.id, suffix, {
    lat: 51.14,
    lon: 17.02,
    title: `E2E zgłoszenie ${suffix}`,
  });
  await uploadApprovedPhoto(request, place.id, photoCaption);

  await page.goto("/");
  await expect(page.locator(".map-frame")).toBeVisible();
  await clickMapMarker(page, place.title);
  await clickMapMarker(page, photoCaption);

  const detailDialog = page.getByRole("dialog", { name: place.title });
  await expect(detailDialog).toBeVisible();
  await detailDialog.getByRole("button", { name: "Pokaż informacje" }).click();
  await expect(detailDialog.getByText(photoCaption)).toBeVisible();
  await detailDialog.getByRole("button", { name: "Zgłoś problem" }).click();

  const reportFormDialog = page.getByRole("dialog", { name: "Zgłoś problem" });
  await expect(reportFormDialog).toBeVisible();
  await reportFormDialog.getByLabel("Powód").selectOption("bad_photo");
  await reportFormDialog.getByLabel("Wiadomość").fill(reportMessage);
  await reportFormDialog.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
  await expect(reportFormDialog.getByText("Zgłoszenie trafiło do redakcji.")).toBeVisible();

  const adminTabs = await unlockAdmin(page);
  await openAdminModerationSection(page, adminTabs, /Zgłoszenia/);
  await openStatusTab(page, /Otwarte/);

  const openReport = page.locator(".report-item").filter({ hasText: reportMessage });
  await expect(openReport).toContainText("otwarte");
  await expect(openReport).toContainText("Problem ze zdjęciem");
  await openReport.getByRole("button", { name: "Otwórz" }).click();

  const reportDialog = page.getByRole("dialog", { name: "Problem ze zdjęciem" });
  await expect(reportDialog).toBeVisible();
  await expect(reportDialog).toContainText(reportMessage);
  await expect(reportDialog).toContainText("otwarte");
  await reportDialog.getByRole("button", { name: "Zamknij zgłoszenie" }).click();
  await expect(reportDialog).toContainText("zamknięte");
  await reportDialog.getByRole("button", { name: "Gotowe" }).click();
  await expect(openReport).toBeHidden();

  await openStatusTab(page, /Zamknięte/);
  const closedReport = page.locator(".report-item").filter({ hasText: reportMessage });
  await expect(closedReport).toContainText("zamknięte");
  await expect(closedReport).toContainText("Problem ze zdjęciem");
  await closedReport.getByRole("button", { name: "Otwórz" }).click();
  await expect(reportDialog).toBeVisible();
  await reportDialog.getByRole("button", { name: "Usuń" }).click();

  const deleteDialog = page.getByRole("dialog", { name: "Usunąć zgłoszenie?" });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Usuń" }).click();
  await expect(deleteDialog).toBeHidden();
  await expect(closedReport).toBeHidden();
});
