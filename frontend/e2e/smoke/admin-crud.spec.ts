import { expect, test } from "@playwright/test";

import { PHOTO_BUFFER } from "../fixtures/media";
import { API_URL } from "../support/config";
import { expandPlaceCityGroup, unlockAdmin } from "../support/adminUi";
import { createCategory, createPlace, expectJson, getMapPlaces } from "../support/smokeApi";

test("admin gate is reachable", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByLabel("Token")).toBeVisible();
  await expect(page.getByRole("button", { name: "Wejdź do panelu" })).toBeVisible();
});

test("admin can upload an approved place photo through UI", async ({ page, request }) => {
  const suffix = `${Date.now()}-${test.info().workerIndex}`;
  const caption = `Zdjęcie e2e ${suffix}`;
  const category = await createCategory(request, suffix);
  const place = await createPlace(request, category.id, suffix);

  await unlockAdmin(page);
  await expandPlaceCityGroup(page, "Wrocław");
  const placeRow = page.locator(".place-city-group .table-row").filter({ hasText: place.title });
  await placeRow.getByRole("button", { name: `Galeria zdjęć miejsca ${place.title}` }).click();

  const photoPanelDialog = page.getByRole("dialog", { name: "Zdjęcia miejsca" });
  await expect(photoPanelDialog).toBeVisible();
  await photoPanelDialog.getByRole("button", { name: "Dodaj zdjęcie" }).click();
  const uploadDialog = page.getByRole("dialog", { name: "Dodaj zdjęcie" });
  await expect(uploadDialog).toBeVisible();
  await uploadDialog.getByLabel("Zdjęcie").setInputFiles({
    buffer: PHOTO_BUFFER,
    mimeType: "image/jpeg",
    name: "e2e-photo.jpg",
  });
  await uploadDialog.getByLabel("Podpis").fill(caption);
  await uploadDialog.getByRole("button", { name: "Dodaj zdjęcie" }).click();
  await expect(uploadDialog).toBeHidden();

  const approvedItem = photoPanelDialog.locator(".admin-media-item").filter({ hasText: caption });
  await expect(approvedItem).toContainText("zatwierdzone");

  await expect
    .poll(async () => {
      const mapPlaces = await getMapPlaces(request, place.city_id);
      const mapPlace = mapPlaces.find((item) => item.id === place.id);
      return {
        coverCaption: mapPlace?.cover_photo?.caption ?? null,
        photoCount: mapPlace?.photo_count ?? 0,
      };
    })
    .toEqual({ coverCaption: caption, photoCount: 1 });

  await page.goto("/");
  await expect(page.locator(".map-frame")).toBeVisible();
  await expect(page.getByText("Nie udało się pobrać miejsc")).toHaveCount(0);
});

test("admin can create category, place and guide through UI", async ({ page, request }) => {
  const suffix = `${Date.now()}-${test.info().workerIndex}`;
  const safeSuffix = suffix.replace(/[^a-zA-Z0-9]+/g, "_");
  const categoryId = `e2e_ui_category_${safeSuffix}`;
  const categoryLabel = `E2E UI kategoria ${suffix}`;
  const editedCategoryLabel = `${categoryLabel} edycja`;
  const placeTitle = `E2E UI miejsce ${suffix}`;
  const editedPlaceTitle = `${placeTitle} edycja`;
  const guideTitle = `E2E UI trasa ${suffix}`;
  const guideSlug = `e2e-ui-trasa-${suffix}`;

  const adminTabs = await unlockAdmin(page);
  await expect(adminTabs.getByRole("button", { name: /Miejsca/ })).toBeVisible();
  await expect(adminTabs.getByRole("button", { name: /Moderacja/ })).toBeVisible();
  await expect(adminTabs.getByRole("button", { name: /Trasy/ })).toBeVisible();
  await expect(adminTabs.getByRole("button", { name: /Konfiguracja/ })).toBeVisible();
  await expect(adminTabs.getByRole("button", { name: /Ustawienia/ })).toHaveCount(0);
  await expect(adminTabs.getByRole("button", { name: /Kategorie/ })).toHaveCount(0);
  await expect(adminTabs.getByRole("button", { name: /Zdjęcia/ })).toHaveCount(0);
  await expect(adminTabs.getByRole("button", { name: /Pamiątki/ })).toHaveCount(0);
  await expect(adminTabs.getByRole("button", { name: /Zgłoszenia/ })).toHaveCount(0);

  await adminTabs.getByRole("button", { name: /Miejsca/ }).click();
  await page.locator(".places-manager .admin-toolbar").getByRole("button", { name: "Zarządzaj kategoriami" }).click();

  const categoryManagerDialog = page.getByRole("dialog", { name: "Zarządzaj kategoriami" });
  await expect(categoryManagerDialog).toBeVisible();
  await categoryManagerDialog.locator(".admin-toolbar").getByRole("button", { name: "Dodaj kategorię" }).click();
  const categoryDialog = page.getByRole("dialog", { name: "Dodaj kategorię" });
  await expect(categoryDialog).toBeVisible();
  await categoryDialog.getByLabel("ID").fill(categoryId);
  await categoryDialog.getByLabel("Nazwa").fill(categoryLabel);
  await categoryDialog.getByLabel("Ikona").fill("map-pin");
  await categoryDialog.getByLabel("Kolejność").fill("107");
  await categoryDialog.getByLabel("Opis").fill("Kategoria dodana przez e2e");
  await categoryDialog.getByLabel("Status").selectOption("active");
  await categoryDialog.getByRole("button", { name: "Dodaj kategorię" }).click();
  await expect(categoryDialog).toBeHidden();

  let categoryRow = categoryManagerDialog.locator(".category-row").filter({ hasText: categoryLabel });
  await expect(categoryRow).toContainText(categoryId);
  await expect(categoryRow).toContainText("aktywna");

  await categoryManagerDialog.getByRole("button", { name: "Zamknij modal" }).click();
  await expect(categoryManagerDialog).toBeHidden();

  await page.locator(".places-manager").getByRole("button", { name: "Dodaj miejsce" }).click();
  const placeDialog = page.getByRole("dialog", { name: "Dodaj miejsce" });
  await expect(placeDialog).toBeVisible();
  await expect(placeDialog.getByRole("checkbox", { name: categoryLabel })).toBeVisible();

  await placeDialog.getByRole("checkbox", { name: categoryLabel }).check();
  await expect(placeDialog.getByRole("checkbox", { name: categoryLabel })).toBeChecked();

  await placeDialog.getByRole("button", { name: "Zarządzaj kategoriami" }).click();
  await expect(categoryManagerDialog).toBeVisible();
  categoryRow = categoryManagerDialog.locator(".category-row").filter({ hasText: categoryLabel });
  await categoryRow.getByRole("button", { name: "Edytuj" }).click();
  const editCategoryDialog = page.getByRole("dialog", { name: "Edytuj kategorię" });
  await expect(editCategoryDialog).toBeVisible();
  await editCategoryDialog.getByLabel("Nazwa").fill(editedCategoryLabel);
  await editCategoryDialog.getByRole("button", { name: "Zapisz kategorię" }).click();
  await expect(editCategoryDialog).toBeHidden();
  await categoryManagerDialog.getByRole("button", { name: "Zamknij modal" }).click();
  await expect(categoryManagerDialog).toBeHidden();
  await expect(placeDialog.getByRole("checkbox", { name: editedCategoryLabel })).toBeChecked();

  await placeDialog.getByLabel("Nazwa").fill(placeTitle);
  await placeDialog.getByLabel("Opis").fill("Opis miejsca dodanego przez e2e");
  await placeDialog.getByLabel("Lokalny komentarz").fill("Komentarz lokalny e2e");
  await placeDialog.getByLabel("Priorytet redakcji").fill("1.8");
  await placeDialog.getByLabel("Status").selectOption("published");
  await placeDialog.getByRole("button", { name: "Dodaj miejsce" }).click();
  await expect(placeDialog).toBeHidden();

  await expandPlaceCityGroup(page, "Wrocław");
  const placeRow = page.locator(".place-table .table-row").filter({ hasText: placeTitle });
  await expect(placeRow).toContainText(categoryLabel);
  await expect(placeRow).toContainText("1.8");

  await placeRow.getByRole("button", { name: "Edytuj" }).click();
  const editPlaceDialog = page.getByRole("dialog", { name: "Edytuj miejsce" });
  await expect(editPlaceDialog).toBeVisible();
  await expect(editPlaceDialog.getByLabel("Status")).toHaveValue("published");
  await expect(editPlaceDialog.getByLabel("Priorytet redakcji")).toHaveValue("1.8");
  await editPlaceDialog.getByLabel("Nazwa").fill(editedPlaceTitle);
  await editPlaceDialog.getByRole("button", { name: "Zapisz zmiany" }).click();
  await expect(editPlaceDialog).toBeHidden();

  const editedPlaceRow = page.locator(".place-table .table-row").filter({ hasText: editedPlaceTitle });
  await expect(editedPlaceRow).toContainText(categoryLabel);

  await adminTabs.getByRole("button", { name: /Trasy/ }).click();
  await page.locator(".guide-manager .admin-toolbar").getByRole("button", { name: "Dodaj trasę lub kolekcję" }).click();
  const guideDialog = page.getByRole("dialog", { name: "Dodaj trasę lub kolekcję" });
  await expect(guideDialog).toBeVisible();
  await guideDialog.getByLabel("Tytuł").fill(guideTitle);
  await guideDialog.getByLabel("Opis").fill("Trasa dodana przez e2e");
  await guideDialog.getByLabel("Status").selectOption("published");
  await guideDialog.getByRole("button", { name: "Dodaj" }).click();
  await expect(guideDialog).toBeHidden();

  const guideRow = page.locator(".guide-row").filter({ hasText: guideTitle });
  await expect(guideRow).toContainText("opublikowana");
  const guidePanel = guideRow.locator(".guide-detail-panel").first();
  if ((await guidePanel.count()) === 0) {
    await guideRow.getByRole("button", { exact: true, name: "Miejsca" }).click();
  }
  await expect(guidePanel).toBeVisible();
  await guideRow.locator(".guide-place-choice").filter({ hasText: editedPlaceTitle }).getByRole("checkbox").check();
  await guideRow.getByRole("button", { name: "Dodaj 1" }).click();
  await expect(guideRow.locator(".guide-place-row").filter({ hasText: editedPlaceTitle })).toBeVisible();

  await expect
    .poll(async () => {
      const guide = await expectJson<{ places: Array<{ title: string }>; slug: string }>(
        request.get(`${API_URL}/api/guides/${guideSlug}`),
        200,
      );
      return {
        placeTitles: guide.places.map((place) => place.title),
      };
    })
    .toEqual({ placeTitles: [editedPlaceTitle] });

  await guideRow.locator(".guide-row-summary .guide-actions .ui-button--danger").click();
  const deleteGuideDialog = page.getByRole("dialog", { name: "Usunąć trasę?" });
  await expect(deleteGuideDialog).toBeVisible();
  await expect(deleteGuideDialog).toContainText("Same miejsca zostaną w bazie.");
  await deleteGuideDialog.getByRole("button", { name: "Usuń" }).click();
  await expect(deleteGuideDialog).toBeHidden();
  await expect(guideRow).toBeHidden();
  const deletedGuideResponse = await request.get(`${API_URL}/api/guides/${guideSlug}`);
  expect(deletedGuideResponse.status()).toBe(404);
});
