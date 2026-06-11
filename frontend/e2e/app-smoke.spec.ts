import { expect, type APIRequestContext, test } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";
const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN ?? "dev-admin-token";
const PHOTO_BUFFER = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAQABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDjaKKK2PmT/9k=",
  "base64",
);

type CategoryResponse = {
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

async function createPlace(
  request: APIRequestContext,
  categoryId: string,
  suffix: string,
  overrides: Partial<{ lat: number; lon: number; title: string }> = {},
) {
  return expectJson<PlaceResponse>(
    request.post(`${API_URL}/api/admin/places`, {
      data: {
        category_id: categoryId,
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

test("admin can upload and approve a place photo through UI", async ({ page, request }) => {
  const suffix = `${Date.now()}-${test.info().workerIndex}`;
  const caption = `Zdjęcie e2e ${suffix}`;
  const category = await createCategory(request, suffix);
  const place = await createPlace(request, category.id, suffix);

  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();

  const adminTabs = page.getByRole("navigation", { name: "Sekcje panelu admina" });
  await expect(adminTabs).toBeVisible();
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

  await page.getByRole("button", { name: /Do sprawdzenia/ }).click();
  const pendingAlbum = page.locator(".admin-media-album-summary").filter({ hasText: place.title });
  await expect(pendingAlbum).toContainText("1 zdjęcie");
  await pendingAlbum.click();

  const pendingItem = page.locator(".admin-media-item").filter({ hasText: caption });
  await expect(pendingItem).toContainText("do sprawdzenia");
  await pendingItem.getByRole("button", { name: "Zatwierdź" }).click();
  await expect(pendingItem).toBeHidden();

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
  await page.locator(`[title="${place.title}"]`).first().click();
  await page.locator(`[title="Byłem tutaj: ${place.title}"]`).click();

  const memorySheet = page.locator('aside[aria-label="Byłem tutaj"]');
  await expect(memorySheet).toBeVisible();
  await memorySheet.getByPlaceholder("Wpisz token").fill(claimToken);
  await memorySheet.getByLabel("Zdjęcie pamiątki").setInputFiles({
    buffer: PHOTO_BUFFER,
    mimeType: "image/jpeg",
    name: "e2e-memory.jpg",
  });
  await memorySheet.getByLabel("Podpis").fill(caption);
  await memorySheet.getByLabel("Myśl / wspomnienie").fill(memoryText);
  await memorySheet.getByLabel("Imię").fill(authorName);
  await memorySheet.getByLabel("Miasto").fill(authorCity);
  await memorySheet.locator('input[type="checkbox"]').check();
  await memorySheet.getByRole("button", { name: "Dodaj pamiątkę" }).click();

  await expect(memorySheet).toBeHidden();
  const thanksDialog = page.getByRole("dialog", { name: "Pamiątka trafiła do moderacji" });
  await expect(thanksDialog).toBeVisible();
  await thanksDialog.getByRole("button", { name: "OK" }).click();

  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();

  const adminTabs = page.getByRole("navigation", { name: "Sekcje panelu admina" });
  await expect(adminTabs).toBeVisible();
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
      return {
        memoryCount: mapPlace?.memory_count ?? 0,
        memoryText: mapPlace?.memories[0]?.memory_text ?? null,
      };
    })
    .toEqual({ memoryCount: 1, memoryText });

  await page.goto("/");
  await expect(page.locator(".map-frame")).toBeVisible();
  await page.locator(`[title="${place.title}"]`).first().click();
  await expect(page.locator(`[title="${caption}"]`)).toBeVisible();
});

test("visitor can report a photo and admin can close the report through UI", async ({ page, request }) => {
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
  await page.locator(`[title="${place.title}"]`).first().click();
  await page.locator(`[title="${photoCaption}"]`).click();

  const previewDialog = page.getByRole("dialog", { name: `Zdjęcie: ${place.title}` });
  await expect(previewDialog).toBeVisible();
  await previewDialog.getByRole("button").click();

  const detailDialog = page.getByRole("dialog", { name: place.title });
  await expect(detailDialog).toBeVisible();
  await detailDialog.getByRole("button", { name: "Zgłoś problem" }).click();

  const reportSheet = page.locator('aside[aria-label="Zgłoś problem"]');
  await expect(reportSheet).toBeVisible();
  await reportSheet.getByLabel("Powód").selectOption("bad_photo");
  await reportSheet.getByLabel("Wiadomość").fill(reportMessage);
  await reportSheet.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
  await expect(reportSheet.getByText("Zgłoszenie trafiło do redakcji.")).toBeVisible();

  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();

  const adminTabs = page.getByRole("navigation", { name: "Sekcje panelu admina" });
  await expect(adminTabs).toBeVisible();
  await adminTabs.getByRole("button", { name: /Zgłoszenia/ }).click();
  await page.getByRole("button", { name: /Otwarte/ }).click();

  const openReport = page.locator(".report-item").filter({ hasText: reportMessage });
  await expect(openReport).toContainText("open");
  await expect(openReport).toContainText("bad_photo");
  await openReport.getByRole("button", { name: "Zamknij" }).click();
  await expect(openReport).toBeHidden();

  await page.getByRole("button", { name: /Zamknięte/ }).click();
  const closedReport = page.locator(".report-item").filter({ hasText: reportMessage });
  await expect(closedReport).toContainText("closed");
  await expect(closedReport).toContainText("bad_photo");
});
