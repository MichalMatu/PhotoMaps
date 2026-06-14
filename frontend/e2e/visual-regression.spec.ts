import { expect, type Page, test } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";
const SNAPSHOT_OPTIONS = {
  animations: "disabled" as const,
  maxDiffPixelRatio: 0.02,
};
const NOW = "2026-06-12T09:00:00.000Z";

const city = {
  default_zoom: 13,
  id: "wroclaw",
  lat: 51.1079,
  lon: 17.0385,
  name: "Wrocław",
  sort_order: 10,
  status: "active",
};

const categories = [
  {
    description: "Adresy znane i lubiane przez mieszkańców.",
    icon: "landmark",
    id: "local_classic",
    label: "Lokalny klasyk",
    sort_order: 1,
    status: "active",
  },
  {
    description: "Miejsca poza oczywistą trasą.",
    icon: "sparkles",
    id: "hidden_gem",
    label: "Hidden gem",
    sort_order: 2,
    status: "active",
  },
];

function photo(id: string, placeId: string, caption: string) {
  return {
    approved_at: NOW,
    caption,
    created_at: NOW,
    id,
    place_id: placeId,
    public_path: `/media/visual/${id}.svg`,
    role: "gallery",
    source: "editorial",
    status: "approved",
    thumb_path: `/media/visual/${id}-thumb.svg`,
  };
}

const rynekCover = photo("visual-rynek-cover", "visual-rynek", "Rynek od strony przejścia");
const rynekSide = photo("visual-rynek-side", "visual-rynek", "Detal kamienic");
const nadodrzeCover = photo("visual-nadodrze-cover", "visual-nadodrze", "Szyldy Nadodrza");
const rynekMemory = {
  approved_at: NOW,
  author_city: "Wrocław",
  author_name: "Marta",
  caption: "Wieczorne światło",
  consent_confirmed: true,
  created_at: NOW,
  id: "visual-rynek-memory",
  memory_text: "Krótki spacer po pracy.",
  paid: false,
  place_id: "visual-rynek",
  public_path: "/media/visual/visual-rynek-memory.svg",
  share_slug: "visual-memory",
  status: "approved",
  thumb_path: "/media/visual/visual-rynek-memory-thumb.svg",
};

const places = [
  {
    category_ids: ["local_classic"],
    categories: [categories[0]],
    city,
    city_id: city.id,
    cover_photo: rynekCover,
    cover_photo_id: rynekCover.id,
    created_at: NOW,
    description: "Historyczne centrum z ratuszem, detalami i bocznymi przejściami.",
    id: "visual-rynek",
    lat: 51.1097,
    local_comment: "Najlepsze kadry są tuż obok głównego placu.",
    lon: 17.0325,
    memory_count: 1,
    photo_count: 2,
    preview_items: [
      { ...rynekCover, kind: "photo" },
      { ...rynekSide, kind: "photo" },
      { ...rynekMemory, kind: "memory" },
    ],
    score: 8,
    slug: "visual-rynek",
    status: "published",
    title: "Rynek Wrocław",
    updated_at: NOW,
    weight: 2,
  },
  {
    category_ids: ["hidden_gem"],
    categories: [categories[1]],
    city,
    city_id: city.id,
    cover_photo: nadodrzeCover,
    cover_photo_id: nadodrzeCover.id,
    created_at: NOW,
    description: "Murale, szyldy i drobne miejskie warstwy.",
    id: "visual-nadodrze",
    lat: 51.1208,
    local_comment: "Miejsce do spokojnego łapania detali.",
    lon: 17.0332,
    memory_count: 0,
    photo_count: 1,
    preview_items: [{ ...nadodrzeCover, kind: "photo" }],
    score: 4,
    slug: "visual-nadodrze",
    status: "published",
    title: "Nadodrze: murale",
    updated_at: NOW,
    weight: 1.4,
  },
];

const guidePreviewPlaces = [
  {
    cover_photo: rynekCover,
    description: places[0].description,
    id: places[0].id,
    local_comment: places[0].local_comment,
    memory_count: places[0].memory_count,
    photo_count: places[0].photo_count,
    slug: places[0].slug,
    status: places[0].status,
    title: places[0].title,
  },
  {
    cover_photo: nadodrzeCover,
    description: places[1].description,
    id: places[1].id,
    local_comment: places[1].local_comment,
    memory_count: places[1].memory_count,
    photo_count: places[1].photo_count,
    slug: places[1].slug,
    status: places[1].status,
    title: places[1].title,
  },
];

const guides = [
  {
    cover_photo: rynekCover,
    created_at: NOW,
    description: "Krótka trasa przez centrum i boczne przejścia z dobrymi kadrami.",
    id: "visual-guide",
    place_count: 2,
    preview_places: guidePreviewPlaces,
    slug: "wizualny-spacer",
    status: "published",
    title: "Wizualny spacer po centrum",
    updated_at: NOW,
  },
  {
    cover_photo: nadodrzeCover,
    created_at: NOW,
    description: "Miejsca, gdzie woda, mosty i panoramy robią najwięcej pracy w kadrze.",
    id: "visual-guide-river",
    place_count: 2,
    preview_places: [...guidePreviewPlaces].reverse(),
    slug: "kadry-nad-odra",
    status: "published",
    title: "Kadry nad Odrą",
    updated_at: NOW,
  },
  {
    cover_photo: rynekSide,
    created_at: NOW,
    description: "Zestaw ciaśniejszych przejść, szyldów i detali do sprawdzania miejskiego rytmu.",
    id: "visual-guide-details",
    place_count: 2,
    preview_places: guidePreviewPlaces,
    slug: "detale-i-przejscia",
    status: "published",
    title: "Detale i przejścia",
    updated_at: NOW,
  },
];

const guideDetail = {
  ...guides[0],
  places: guides[0].preview_places,
};

const wideGuideList = Array.from({ length: 6 }, (_, index) => {
  const guide = guides[index % guides.length];
  return {
    ...guide,
    id: `${guide.id}-${index}`,
    slug: `${guide.slug}-${index}`,
    title: `${guide.title} ${index + 1}`,
  };
});

function imageSvg(url: string) {
  const isSecondary = url.includes("nadodrze") || url.includes("side");
  const fill = isSecondary ? "#0a84ff" : "#34c759";
  const accent = isSecondary ? "#ffd60a" : "#0a84ff";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <rect width="640" height="420" fill="${fill}"/>
    <rect x="44" y="46" width="552" height="328" rx="28" fill="${accent}" opacity=".72"/>
    <rect x="84" y="86" width="220" height="248" rx="18" fill="#ffffff" opacity=".28"/>
    <rect x="336" y="112" width="220" height="188" rx="18" fill="#000000" opacity=".18"/>
  </svg>`;
}

function tileSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#eef3e8"/>
    <path d="M0 80h256M0 176h256M80 0v256M176 0v256" stroke="#d1dcc9" stroke-width="5"/>
    <path d="M-20 220C60 172 114 186 276 124" stroke="#9fb3c8" stroke-width="18" fill="none" opacity=".7"/>
    <path d="M-10 42C72 80 148 82 266 36" stroke="#e2d4a2" stroke-width="10" fill="none" opacity=".9"/>
  </svg>`;
}

async function mockSharedApi(page: Page, mapPlaces = places, guideList = guides) {
  await page.route("https://*.tile.openstreetmap.org/**", (route) =>
    route.fulfill({ body: tileSvg(), contentType: "image/svg+xml" }),
  );
  await page.route(`${API_URL}/media/**`, (route) =>
    route.fulfill({ body: imageSvg(route.request().url()), contentType: "image/svg+xml" }),
  );
  await page.route(`${API_URL}/api/places/map`, (route) => route.fulfill({ json: mapPlaces }));
  await page.route(`${API_URL}/api/places/${places[0].id}/memories/${rynekMemory.id}`, (route) =>
    route.fulfill({ json: rynekMemory }),
  );
  await page.route(`${API_URL}/api/categories`, (route) => route.fulfill({ json: categories }));
  await page.route(`${API_URL}/api/cities`, (route) => route.fulfill({ json: [city] }));
  await page.route(`${API_URL}/api/guides`, (route) => route.fulfill({ json: guideList }));
  await page.route(`${API_URL}/api/guides/wizualny-spacer`, (route) => route.fulfill({ json: guideDetail }));
}

async function mockAdminApi(page: Page) {
  await mockSharedApi(page);
  await page.route(`${API_URL}/api/admin/categories`, (route) => route.fulfill({ json: categories }));
  await page.route(`${API_URL}/api/admin/cities`, (route) => route.fulfill({ json: [city] }));
  await page.route(`${API_URL}/api/admin/guides`, (route) => route.fulfill({ json: guides }));
  await page.route(`${API_URL}/api/admin/memories`, (route) => route.fulfill({ json: [] }));
  await page.route(`${API_URL}/api/admin/places`, (route) => route.fulfill({ json: places }));
  await page.route(`${API_URL}/api/admin/photos`, (route) =>
    route.fulfill({ json: [rynekCover, rynekSide, nadodrzeCover] }),
  );
  await page.route(`${API_URL}/api/admin/reports`, (route) => route.fulfill({ json: [] }));
}

async function clickMapMarker(page: Page, title: string) {
  const marker = page.locator(`[title="${title}"]`).first();
  await expect(marker).toBeVisible();
  await marker.evaluate((element) => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  });
}

async function guideCardRows(page: Page) {
  const cardPositions = await page.locator(".guide-card").evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
      };
    }),
  );

  return [
    ...cardPositions
      .reduce((rows, position) => {
        const row = rows.get(position.top) ?? {
          count: 0,
          left: Number.POSITIVE_INFINITY,
          right: 0,
        };
        rows.set(position.top, {
          count: row.count + 1,
          left: Math.min(row.left, position.left),
          right: Math.max(row.right, position.right),
        });
        return rows;
      }, new Map<number, { count: number; left: number; right: number }>())
      .values(),
  ];
}

test("visual: empty desktop map", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page, []);
  await page.goto("/");
  await expect(page.locator(".map-frame")).toBeVisible();
  await expect(page).toHaveScreenshot("map-empty-desktop.png", SNAPSHOT_OPTIONS);
});

test("visual: map markers, fan and photo detail", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);
  await page.goto("/");
  await expect(page.locator(".place-photo-marker")).toHaveCount(2);
  await expect(page).toHaveScreenshot("map-markers-desktop.png", SNAPSHOT_OPTIONS);

  await clickMapMarker(page, places[0].title);
  await expect(page.locator(".photo-fan-marker")).toHaveCount(3);
  await expect(page).toHaveScreenshot("map-fan-desktop.png", SNAPSHOT_OPTIONS);

  await clickMapMarker(page, rynekCover.caption);
  const detailDialog = page.getByRole("dialog", { name: places[0].title });
  await expect(detailDialog).toBeVisible();
  await expect(detailDialog.getByText(rynekCover.caption)).toBeVisible();
  await expect(detailDialog.getByText(places[0].description)).toBeVisible();
  await expect(page.locator(".map-photo-viewer")).toHaveCount(0);

  const desktopLayout = await detailDialog.evaluate((element) => {
    const dialogRect = element.getBoundingClientRect();
    const imageRect = element.querySelector(".photo-detail-image")?.getBoundingClientRect();
    return {
      dialogHeight: Math.round(dialogRect.height),
      dialogWidth: Math.round(dialogRect.width),
      imageHeight: Math.round(imageRect?.height ?? 0),
      imageWidth: Math.round(imageRect?.width ?? 0),
      internalScroll: element.scrollHeight > element.clientHeight,
      textBlocks: element.querySelectorAll(".photo-detail-text").length,
    };
  });

  expect(desktopLayout.internalScroll).toBe(false);
  expect(desktopLayout.textBlocks).toBe(1);
  expect(desktopLayout.imageWidth).toBeGreaterThanOrEqual(desktopLayout.dialogWidth - 4);
  expect(desktopLayout.imageHeight).toBeGreaterThanOrEqual(desktopLayout.dialogHeight - 4);

  await page.keyboard.press("Escape");
  await expect(detailDialog).toBeHidden();
  await clickMapMarker(page, rynekMemory.caption);
  await expect(detailDialog.getByText(rynekMemory.caption)).toBeVisible();
  await expect(detailDialog.getByText(rynekMemory.memory_text)).toBeVisible();
  await expect(detailDialog.getByText(`${rynekMemory.author_name}, ${rynekMemory.author_city}`)).toBeVisible();
});

test("visual: mobile photo detail fills the modal without internal scrolling", async ({ page }) => {
  await page.setViewportSize({ height: 780, width: 390 });
  await mockSharedApi(page);
  await page.goto("/");
  await clickMapMarker(page, places[0].title);
  await clickMapMarker(page, rynekCover.caption);

  const detailDialog = page.getByRole("dialog", { name: places[0].title });
  await expect(detailDialog).toBeVisible();
  const mobileLayout = await detailDialog.evaluate((element) => {
    const dialogRect = element.getBoundingClientRect();
    const imageRect = element.querySelector(".photo-detail-image")?.getBoundingClientRect();
    return {
      dialogHeight: Math.round(dialogRect.height),
      dialogWidth: Math.round(dialogRect.width),
      imageHeight: Math.round(imageRect?.height ?? 0),
      imageWidth: Math.round(imageRect?.width ?? 0),
      internalScroll: element.scrollHeight > element.clientHeight,
    };
  });

  expect(mobileLayout.dialogHeight).toBeGreaterThan(400);
  expect(mobileLayout.internalScroll).toBe(false);
  expect(mobileLayout.imageWidth).toBeGreaterThanOrEqual(mobileLayout.dialogWidth - 4);
  expect(mobileLayout.imageHeight).toBeGreaterThanOrEqual(mobileLayout.dialogHeight - 4);
});

test("visual: mobile memory sheet", async ({ page }) => {
  await page.setViewportSize({ height: 780, width: 390 });
  await mockSharedApi(page);
  await page.goto("/");
  await clickMapMarker(page, places[0].title);
  await clickMapMarker(page, `Byłem tutaj: ${places[0].title}`);
  await expect(page.getByRole("dialog", { name: "Byłem tutaj" })).toBeVisible();
  await expect(page).toHaveScreenshot("memory-sheet-mobile.png", SNAPSHOT_OPTIONS);
});

test("visual: guides list and detail", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page);
  await page.goto("/guides");
  await expect(page.locator(".guide-card")).toHaveCount(3);
  expect((await guideCardRows(page)).map((row) => row.count)).toEqual([3]);

  await page.setViewportSize({ height: 820, width: 1920 });
  await page.unroute(`${API_URL}/api/guides`);
  await page.route(`${API_URL}/api/guides`, (route) => route.fulfill({ json: wideGuideList }));
  await page.goto("/guides");
  await expect(page.locator(".guide-card")).toHaveCount(6);
  const wideRows = await guideCardRows(page);
  expect(wideRows.map((row) => row.count)).toEqual([4, 2]);
  expect(Math.abs(wideRows[1].left - wideRows[0].left)).toBeLessThanOrEqual(1);
  expect(wideRows[1].right).toBeLessThan(wideRows[0].right);

  await page.setViewportSize({ height: 820, width: 1280 });
  await page.goto("/guides/wizualny-spacer");
  await expect(page.locator(".guide-place-card")).toHaveCount(2);
  await expect(page).toHaveScreenshot("guide-detail-desktop.png", SNAPSHOT_OPTIONS);
});

test("visual: admin place table", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockAdminApi(page);
  await page.goto("/");
  await page.evaluate(() => window.sessionStorage.setItem("photomaps_admin_token", "dev-admin-token"));
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Miejsca/ })
    .click();
  const cityToggle = page.locator(".place-city-toggle").filter({ hasText: city.name });
  await cityToggle.click();
  await expect(cityToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".place-city-group .table-row")).toHaveCount(2);
  await expect(page).toHaveScreenshot("admin-place-table-desktop.png", SNAPSHOT_OPTIONS);
});
