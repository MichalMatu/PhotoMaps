import { expect, type APIRequestContext, type Locator, type Page, test } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";
const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN ?? "dev-admin-token";
const PHOTO_BUFFER = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAQABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDjaKKK2PmT/9k=",
  "base64",
);

type CategoryResponse = {
  id: string;
};

type CityResponse = {
  id: string;
};

type PlaceResponse = {
  id: string;
  title: string;
};

type PhotoResponse = {
  id: string;
};

type MapPlaceResponse = {
  cover_photo: { caption: string | null } | null;
  id: string;
  memories: Array<{ caption: string; memory_text: string }>;
  memory_count: number;
  photo_count: number;
  title: string;
};

function adminHeaders() {
  return {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  };
}

async function expectJson<T>(
  responsePromise: Promise<{ status: () => number; text: () => Promise<string> }>,
  status: number,
) {
  const response = await responsePromise;
  const body = await response.text();
  expect(response.status(), body).toBe(status);
  return JSON.parse(body) as T;
}

async function createCategory(request: APIRequestContext, suffix: string) {
  return expectJson<CategoryResponse>(
    request.post(`${API_URL}/api/admin/categories`, {
      data: {
        description: "Kategoria dla e2e",
        icon: "map-pin",
        id: `e2e-category-${suffix}`,
        label: `E2E kategoria ${suffix}`,
        sort_order: 99,
        status: "active",
      },
      headers: adminHeaders(),
    }),
    201,
  );
}

async function getDefaultCityId(request: APIRequestContext) {
  const cities = await expectJson<CityResponse[]>(request.get(`${API_URL}/api/cities`), 200);
  expect(cities.length, "seeded e2e city").toBeGreaterThan(0);
  return cities[0].id;
}

async function createPlace(
  request: APIRequestContext,
  categoryId: string,
  suffix: string,
  overrides: Partial<{ lat: number; lon: number; title: string }> = {},
) {
  const cityId = await getDefaultCityId(request);
  return expectJson<PlaceResponse>(
    request.post(`${API_URL}/api/admin/places`, {
      data: {
        category_ids: [categoryId],
        city_id: cityId,
        description: "Miejsce przygotowane przez test e2e",
        lat: overrides.lat ?? 51.1079,
        local_comment: "Lokalny komentarz e2e",
        lon: overrides.lon ?? 17.0385,
        slug: `e2e-place-${suffix}`,
        status: "published",
        title: overrides.title ?? `E2E miejsce ${suffix}`,
        weight: 1,
      },
      headers: adminHeaders(),
    }),
    201,
  );
}

async function getMapPlaces(request: APIRequestContext) {
  return expectJson<MapPlaceResponse[]>(request.get(`${API_URL}/api/places/map`), 200);
}

async function unlockAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();

  const adminTabs = page.getByRole("navigation", { name: "Sekcje panelu admina" });
  await expect(adminTabs).toBeVisible();
  return adminTabs;
}

async function uploadApprovedPhoto(request: APIRequestContext, placeId: string, caption: string) {
  const photo = await expectJson<PhotoResponse>(
    request.post(`${API_URL}/api/places/${placeId}/photos`, {
      multipart: {
        caption,
        consent_confirmed: "true",
        file: {
          buffer: PHOTO_BUFFER,
          mimeType: "image/jpeg",
          name: "e2e-photo.jpg",
        },
      },
    }),
    201,
  );
  await expectJson<PhotoResponse>(
    request.post(`${API_URL}/api/admin/photos/${photo.id}/review`, {
      data: { status: "approved" },
      headers: adminHeaders(),
    }),
    200,
  );
  return photo;
}

async function expectAnimationName(locator: Locator, expectedAnimationName: string) {
  await expect
    .poll(async () => {
      return locator.evaluate((element) => window.getComputedStyle(element).animationName);
    })
    .toContain(expectedAnimationName);
}

async function expectExitPhase(locator: Locator) {
  await expect
    .poll(async () => {
      return locator
        .first()
        .evaluate((element) => element.classList.contains("is-exiting"))
        .catch(() => false);
    })
    .toBe(true);
}

async function expandPlaceCityGroup(page: Page, cityName: string) {
  const cityToggle = page.locator(".place-city-toggle").filter({ hasText: cityName });
  await expect(cityToggle).toBeVisible();
  if ((await cityToggle.getAttribute("aria-expanded")) !== "true") {
    await cityToggle.click();
  }
  await expect(cityToggle).toHaveAttribute("aria-expanded", "true");
}

async function clickMapMarker(page: Page, title: string) {
  const marker = page.locator(`[title="${title}"]`).first();
  await expect(marker).toBeVisible();
  await marker.evaluate((element) => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  });
}

test("public map loads without API error", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".map-frame")).toBeVisible();
  await expect(page.getByText("Nie udało się pobrać miejsc")).toHaveCount(0);
});

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

  const adminTabs = await unlockAdmin(page);
  await adminTabs.getByRole("button", { name: /Zdjęcia/ }).click();

  await page.getByRole("button", { name: "Dodaj zdjęcie" }).click();
  const uploadDialog = page.getByRole("dialog", { name: "Dodaj zdjęcie" });
  await expect(uploadDialog).toBeVisible();
  await uploadDialog.getByLabel("Miejsce").selectOption({ label: place.title });
  await uploadDialog.getByLabel("Zdjęcie").setInputFiles({
    buffer: PHOTO_BUFFER,
    mimeType: "image/jpeg",
    name: "e2e-photo.jpg",
  });
  await uploadDialog.getByLabel("Podpis").fill(caption);
  await uploadDialog.getByRole("button", { name: "Dodaj zdjęcie" }).click();
  await expect(uploadDialog).toBeHidden();

  await page.getByRole("button", { name: /Zatwierdzone/ }).click();
  const approvedAlbum = page.locator(".admin-media-album-summary").filter({ hasText: place.title });
  await expect(approvedAlbum).toContainText("1 zdjęcie");
  await approvedAlbum.click();

  const approvedItem = page.locator(".admin-media-item").filter({ hasText: caption });
  await expect(approvedItem).toContainText("zatwierdzone");

  await expect
    .poll(async () => {
      const mapPlaces = await getMapPlaces(request);
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
  const placeTitle = `E2E UI miejsce ${suffix}`;
  const editedPlaceTitle = `${placeTitle} edycja`;
  const guideTitle = `E2E UI trasa ${suffix}`;
  const guideSlug = `e2e-ui-trasa-${suffix}`;

  const adminTabs = await unlockAdmin(page);
  await adminTabs.getByRole("button", { name: /Kategorie/ }).click();

  await page.locator(".category-toolbar").getByRole("button", { name: "Dodaj kategorię" }).click();
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

  const categoryRow = page.locator(".category-row").filter({ hasText: categoryLabel });
  await expect(categoryRow).toContainText(categoryId);
  await expect(categoryRow).toContainText("active");

  await adminTabs.getByRole("button", { name: /Miejsca/ }).click();
  await page.locator(".places-manager").getByRole("button", { name: "Dodaj miejsce" }).click();
  const placeDialog = page.getByRole("dialog", { name: "Dodaj miejsce" });
  await expect(placeDialog).toBeVisible();
  await placeDialog.getByLabel("Nazwa").fill(placeTitle);
  await placeDialog.getByRole("checkbox", { name: categoryLabel }).check();
  await placeDialog.getByLabel("Opis").fill("Opis miejsca dodanego przez e2e");
  await placeDialog.getByLabel("Lokalny komentarz").fill("Komentarz lokalny e2e");
  await placeDialog.getByLabel("Priorytet redakcji").fill("1.8");
  await placeDialog.getByLabel("Status").selectOption("published");
  await placeDialog.getByRole("button", { name: "Dodaj miejsce" }).click();
  await expect(placeDialog).toBeHidden();

  await expandPlaceCityGroup(page, "Wrocław");
  const placeRow = page.locator(".place-table .table-row").filter({ hasText: placeTitle });
  await expect(placeRow).toContainText(categoryLabel);
  await expect(placeRow).toContainText("published");
  await expect(placeRow).toContainText("1.8");

  await placeRow.getByRole("button", { name: "Edytuj" }).click();
  const editPlaceDialog = page.getByRole("dialog", { name: "Edytuj miejsce" });
  await expect(editPlaceDialog).toBeVisible();
  await expect(editPlaceDialog.getByLabel("Priorytet redakcji")).toHaveValue("1.8");
  await editPlaceDialog.getByLabel("Nazwa").fill(editedPlaceTitle);
  await editPlaceDialog.getByRole("button", { name: "Zapisz zmiany" }).click();
  await expect(editPlaceDialog).toBeHidden();

  const editedPlaceRow = page.locator(".place-table .table-row").filter({ hasText: editedPlaceTitle });
  await expect(editedPlaceRow).toContainText(categoryLabel);

  await adminTabs.getByRole("button", { name: /Trasy/ }).click();
  await page.locator(".guide-toolbar").getByRole("button", { name: "Dodaj trasę" }).click();
  const guideDialog = page.getByRole("dialog", { name: "Dodaj trasę" });
  await expect(guideDialog).toBeVisible();
  await guideDialog.getByLabel("Tytuł").fill(guideTitle);
  await guideDialog.getByLabel("Opis").fill("Trasa dodana przez e2e");
  await guideDialog.getByLabel("Status").selectOption("published");
  await guideDialog.getByRole("button", { name: "Dodaj trasę" }).click();
  await expect(guideDialog).toBeHidden();

  const guideRow = page.locator(".guide-row").filter({ hasText: guideTitle });
  await expect(guideRow).toContainText("published");
  const guidePanel = guideRow.locator(".guide-detail-panel");
  if ((await guidePanel.count()) === 0) {
    await guideRow.getByRole("button", { exact: true, name: "Miejsca" }).click();
  }
  await expect(guidePanel).toBeVisible();
  await guideRow.locator(".guide-place-choice").filter({ hasText: editedPlaceTitle }).getByRole("checkbox").check();
  await guideRow.getByRole("button", { name: "Dodaj 1" }).click();
  await expect(guideRow.locator(".guide-place-row").filter({ hasText: editedPlaceTitle })).toBeVisible();

  await expect
    .poll(async () => {
      const guide = await expectJson<{ places: Array<{ title: string }>; slug: string; status: string }>(
        request.get(`${API_URL}/api/guides/${guideSlug}`),
        200,
      );
      return {
        placeTitles: guide.places.map((place) => place.title),
        status: guide.status,
      };
    })
    .toEqual({ placeTitles: [editedPlaceTitle], status: "published" });

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
  await adminTabs.getByRole("button", { name: /Pamiątki/ }).click();

  await page.getByRole("button", { name: /Do sprawdzenia/ }).click();
  const pendingAlbum = page.locator(".admin-media-album-summary").filter({ hasText: place.title });
  await expect(pendingAlbum).toContainText("1 pamiątka");
  await pendingAlbum.click();

  const pendingItem = page.locator(".admin-media-item").filter({ hasText: caption });
  await expect(pendingItem).toContainText("do sprawdzenia");
  await expect(pendingItem).toContainText(memoryText);
  await expect(pendingItem).toContainText(authorName);
  await pendingItem.getByRole("button", { name: "Zatwierdź" }).click();
  await expect(pendingItem).toBeHidden();

  await page.getByRole("button", { name: /Zatwierdzone/ }).click();
  const approvedAlbum = page.locator(".admin-media-album-summary").filter({ hasText: place.title });
  await expect(approvedAlbum).toContainText("1 pamiątka");
  await approvedAlbum.click();

  const approvedItem = page.locator(".admin-media-item").filter({ hasText: caption });
  await expect(approvedItem).toContainText("zatwierdzone");
  await expect(approvedItem).toContainText(memoryText);

  await expect
    .poll(async () => {
      const mapPlaces = await getMapPlaces(request);
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
  await expect(detailDialog.getByText(photoCaption)).toBeVisible();
  await detailDialog.getByRole("button", { name: "Zgłoś problem" }).click();

  const reportFormDialog = page.getByRole("dialog", { name: "Zgłoś problem" });
  await expect(reportFormDialog).toBeVisible();
  await reportFormDialog.getByLabel("Powód").selectOption("bad_photo");
  await reportFormDialog.getByLabel("Wiadomość").fill(reportMessage);
  await reportFormDialog.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
  await expect(reportFormDialog.getByText("Zgłoszenie trafiło do redakcji.")).toBeVisible();

  const adminTabs = await unlockAdmin(page);
  await adminTabs.getByRole("button", { name: /Zgłoszenia/ }).click();
  await page.getByRole("button", { name: /Otwarte/ }).click();

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

  await page.getByRole("button", { name: /Zamknięte/ }).click();
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
