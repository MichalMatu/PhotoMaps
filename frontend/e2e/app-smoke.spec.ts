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

type MapPlaceResponse = {
  cover_photo: { caption: string | null } | null;
  id: string;
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

async function createPlace(request: APIRequestContext, categoryId: string, suffix: string) {
  return expectJson<PlaceResponse>(
    request.post(`${API_URL}/api/admin/places`, {
      data: {
        category_id: categoryId,
        description: "Miejsce przygotowane przez test e2e",
        lat: 51.1079,
        local_comment: "Lokalny komentarz e2e",
        lon: 17.0385,
        slug: `e2e-place-${suffix}`,
        status: "published",
        title: `E2E miejsce ${suffix}`,
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
