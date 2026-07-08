import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import type { AdminPhoto } from "../../src/api/types";

import {
  adminGuides,
  adminPlaces,
  categories,
  city,
  nadodrzeCover,
  rynekCover,
  rynekSide,
} from "../fixtures/visualData";
import { ADMIN_TOKEN, SNAPSHOT_OPTIONS } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

type AdminPillGeometrySection = {
  contentSelector: string;
  sectionName: RegExp;
  statusTabName?: RegExp;
  statusTablistName?: string;
};

type AdminSectionTabGeometrySection = {
  contentSelector: string;
  sectionName: RegExp;
};

type AdminListProbe = {
  panelSelector: string;
  rowSelector: string;
  sectionName: RegExp;
};

type AdminListStyleSnapshot = {
  panel: {
    backgroundColor: string;
    borderBottomColor: string;
    borderBottomWidth: string;
    borderTopLeftRadius: string;
    boxShadow: string;
  };
  row: {
    backgroundColor: string;
    borderBottomColor: string;
    borderBottomWidth: string;
    borderLeftWidth: string;
    borderTopLeftRadius: string;
    height: number;
    minHeight: string;
    paddingBottom: string;
    paddingLeft: string;
    paddingRight: string;
    paddingTop: string;
  };
};

async function unlockAdmin(page: Page) {
  await page.goto("/");
  await page.evaluate((token) => window.sessionStorage.setItem("photomaps_admin_token", token), ADMIN_TOKEN);
  await page.goto("/admin");
}

async function clickAdminSection(page: Page, sectionName: RegExp) {
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: sectionName })
    .click();
}

async function getRoundedTop(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box).not.toBeNull();
  return Math.round(box?.y ?? 0);
}

async function getRoundedBox(locator: Locator) {
  const box = await locator.first().boundingBox();
  expect(box).not.toBeNull();
  return {
    bottom: Math.round((box?.y ?? 0) + (box?.height ?? 0)),
    height: Math.round(box?.height ?? 0),
    left: Math.round(box?.x ?? 0),
    right: Math.round((box?.x ?? 0) + (box?.width ?? 0)),
    top: Math.round(box?.y ?? 0),
    width: Math.round(box?.width ?? 0),
  };
}

async function getRoundedBoxes(locator: Locator) {
  return locator.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
      };
    }),
  );
}

async function expectAdminPillGeometryIn(toolbar: Locator, page: Page) {
  const expectedHeight = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--admin-pill-height")),
  );
  const pills = toolbar.locator(".admin-segment-tab, .admin-summary-pill");

  await expect(pills.first()).toBeVisible();
  const boxes = await pills.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        height: rect.height,
        top: rect.top,
      };
    }),
  );
  expect(boxes.length).toBeGreaterThan(0);

  const firstTop = Math.round(boxes[0].top);
  for (const box of boxes) {
    expect(Math.abs(Math.round(box.height) - Math.round(expectedHeight))).toBeLessThanOrEqual(1);
    expect(Math.abs(Math.round(box.top) - firstTop)).toBeLessThanOrEqual(1);
  }
}

async function expectAdminPillGeometry(page: Page) {
  await expectAdminPillGeometryIn(page.locator(".admin-toolbar").first(), page);
}

async function getAdminListStyleSnapshot(panel: Locator, rowSelector: string): Promise<AdminListStyleSnapshot> {
  return panel.evaluate((panelElement, selector) => {
    const rowElement = panelElement.querySelector(selector);
    if (!rowElement) {
      throw new Error(`Missing admin list row for selector ${selector}`);
    }

    const panelStyle = window.getComputedStyle(panelElement);
    const rowStyle = window.getComputedStyle(rowElement);
    const rowRect = rowElement.getBoundingClientRect();

    return {
      panel: {
        backgroundColor: panelStyle.backgroundColor,
        borderBottomColor: panelStyle.borderBottomColor,
        borderBottomWidth: panelStyle.borderBottomWidth,
        borderTopLeftRadius: panelStyle.borderTopLeftRadius,
        boxShadow: panelStyle.boxShadow,
      },
      row: {
        backgroundColor: rowStyle.backgroundColor,
        borderBottomColor: rowStyle.borderBottomColor,
        borderBottomWidth: rowStyle.borderBottomWidth,
        borderLeftWidth: rowStyle.borderLeftWidth,
        borderTopLeftRadius: rowStyle.borderTopLeftRadius,
        height: Math.round(rowRect.height),
        minHeight: rowStyle.minHeight,
        paddingBottom: rowStyle.paddingBottom,
        paddingLeft: rowStyle.paddingLeft,
        paddingRight: rowStyle.paddingRight,
        paddingTop: rowStyle.paddingTop,
      },
    };
  }, rowSelector);
}

test("visual: admin place table", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockAdminApi(page);
  await page.goto("/");
  await page.evaluate((token) => window.sessionStorage.setItem("photomaps_admin_token", token), ADMIN_TOKEN);
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Miejsca/ })
    .click();
  const cityToggle = page.locator(".place-city-toggle").filter({ hasText: city.name });
  await cityToggle.click();
  await expect(cityToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".place-table.ui-table-panel")).toBeVisible();
  await expect(page.locator(".place-table .table-head")).toHaveCount(0);
  await expect(page.locator(".place-status-section")).toHaveCount(0);
  await expect(page.locator(".place-city-group .table-row")).toHaveCount(2);
  await expect(page).toHaveScreenshot("admin-place-table-desktop.png", SNAPSHOT_OPTIONS);
});

test("admin place status tabs filter city places without nested sections", async ({ page }) => {
  const statusPlaces = [
    adminPlaces[0],
    {
      ...adminPlaces[1],
      id: "place-draft",
      slug: "miejsce-szkic",
      status: "draft",
      title: "Miejsce szkicowe",
    },
    {
      ...adminPlaces[1],
      id: "place-archived",
      slug: "miejsce-archiwalne",
      status: "archived",
      title: "Miejsce archiwalne",
    },
  ];

  await mockAdminApi(page, { adminPlaceList: statusPlaces });
  await page.goto("/");
  await page.evaluate((token) => window.sessionStorage.setItem("photomaps_admin_token", token), ADMIN_TOKEN);
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Miejsca/ })
    .click();

  const cityToggle = page.locator(".place-city-toggle").filter({ hasText: city.name });
  await cityToggle.click();
  await expect(page.locator(".place-status-section")).toHaveCount(0);
  await expect(page.locator(".place-city-group .table-row").filter({ hasText: adminPlaces[0].title })).toBeVisible();
  await expect(page.locator(".place-city-group .table-row").filter({ hasText: "Miejsce szkicowe" })).toHaveCount(0);
  await expect(page.locator(".place-city-group .table-row").filter({ hasText: "Miejsce archiwalne" })).toHaveCount(0);

  const statusTabs = page.getByRole("tablist", { name: "Status miejsc" });
  await statusTabs.getByRole("tab", { name: /Szkice 1/ }).click();
  await expect(page.locator(".place-city-group .table-row").filter({ hasText: "Miejsce szkicowe" })).toBeVisible();
  await expect(page.locator(".place-city-group .table-row").filter({ hasText: adminPlaces[0].title })).toHaveCount(0);

  await statusTabs.getByRole("tab", { name: /Archiwalne 1/ }).click();
  await expect(page.locator(".place-city-group .table-row").filter({ hasText: "Miejsce archiwalne" })).toBeVisible();
  await expect(page.locator(".place-city-group .table-row").filter({ hasText: "Miejsce szkicowe" })).toHaveCount(0);
});

test("admin place status tabs filter city groups", async ({ page }) => {
  const emptyCity = {
    ...city,
    id: "krakow",
    lat: 50.0614,
    lon: 19.9366,
    name: "Kraków",
    region: "Małopolskie",
    sort_order: 20,
  };
  const statusPlaces = [
    adminPlaces[0],
    {
      ...adminPlaces[1],
      id: "place-draft",
      slug: "miejsce-szkic",
      status: "draft",
      title: "Miejsce szkicowe",
    },
    {
      ...adminPlaces[1],
      id: "place-archived",
      slug: "miejsce-archiwalne",
      status: "archived",
      title: "Miejsce archiwalne",
    },
  ];

  await mockAdminApi(page, { adminCityList: [city, emptyCity], adminPlaceList: statusPlaces });
  await page.goto("/");
  await page.evaluate((token) => window.sessionStorage.setItem("photomaps_admin_token", token), ADMIN_TOKEN);
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Miejsca/ })
    .click();

  const statusTabs = page.getByRole("tablist", { name: "Status miejsc" });
  await expect(statusTabs.getByRole("tab", { name: /Wszystkie/ })).toHaveCount(0);
  await expect(statusTabs.getByRole("tab", { name: /Opublikowane 1/ })).toBeVisible();
  await expect(statusTabs.getByRole("tab", { name: /Szkice 1/ })).toBeVisible();
  await expect(statusTabs.getByRole("tab", { name: /Archiwalne 1/ })).toBeVisible();

  const cityToggle = page.locator(".place-city-toggle").filter({ hasText: city.name });
  await expect(page.locator(".place-city-toggle")).toHaveCount(1);
  await cityToggle.click();

  await statusTabs.getByRole("tab", { name: /Szkice 1/ }).click();
  await expect(page.locator(".place-city-toggle")).toHaveCount(1);
  await expect(page.locator(".place-city-toggle").filter({ hasText: emptyCity.name })).toHaveCount(0);
  await expect(page.locator(".place-city-group .table-row").filter({ hasText: "Miejsce szkicowe" })).toBeVisible();
  await expect(page.locator(".table-row").filter({ hasText: adminPlaces[0].title })).toHaveCount(0);
  await expect(page.locator(".table-row").filter({ hasText: "Miejsce archiwalne" })).toHaveCount(0);

  await statusTabs.getByRole("tab", { name: /Archiwalne 1/ }).click();
  await expect(page.locator(".place-city-toggle")).toHaveCount(1);
  await expect(page.locator(".place-city-toggle").filter({ hasText: emptyCity.name })).toHaveCount(0);
  await expect(page.locator(".place-city-group .table-row").filter({ hasText: "Miejsce archiwalne" })).toBeVisible();
  await expect(page.locator(".table-row").filter({ hasText: "Miejsce szkicowe" })).toHaveCount(0);
});

test("admin place empty modal filter shows one empty state", async ({ page }) => {
  await mockAdminApi(page, { adminPlaceList: [adminPlaces[0]] });
  await page.goto("/");
  await page.evaluate((token) => window.sessionStorage.setItem("photomaps_admin_token", token), ADMIN_TOKEN);
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Miejsca/ })
    .click();

  await page.getByRole("button", { name: "Filtry miejsc" }).click();
  const filterDialog = page.getByRole("dialog", { name: "Filtry miejsc" });
  await filterDialog.getByLabel("Kategoria").selectOption("hidden_gem");
  await filterDialog.getByRole("button", { name: "Gotowe" }).click();

  await expect(page.getByText("Brak miejsc dla wybranych filtrów.")).toHaveCount(1);
  await expect(page.getByText("Brak miejsc w tym mieście.")).toHaveCount(0);
});

test("admin place filter search is focused and submits with Enter", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/");
  await page.evaluate((token) => window.sessionStorage.setItem("photomaps_admin_token", token), ADMIN_TOKEN);
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Miejsca/ })
    .click();

  await page.getByRole("button", { name: "Filtry miejsc" }).click();
  const filterDialog = page.getByRole("dialog", { name: "Filtry miejsc" });
  const searchInput = filterDialog.getByLabel("Szukaj");
  await expect(searchInput).toBeFocused();

  await searchInput.fill("rynek");
  await searchInput.press("Enter");

  await expect(filterDialog).toBeHidden();
  await expect(page.getByRole("button", { name: /Filtry miejsc, aktywne 1/ })).toBeVisible();
  const cityToggle = page.locator(".place-city-toggle").filter({ hasText: city.name });
  await expect(cityToggle).toHaveAttribute("aria-expanded", "true");
  await expect(cityToggle).toContainText("1 miejsce");
  await expect(page.locator(".place-city-group .table-row").filter({ hasText: adminPlaces[0].title })).toBeVisible();
  await expect(page.locator(".place-city-group .table-row").filter({ hasText: adminPlaces[1].title })).toHaveCount(0);
});

test("admin moderation keeps inbox filters in the shared toolbar", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/");
  await page.evaluate((token) => window.sessionStorage.setItem("photomaps_admin_token", token), ADMIN_TOKEN);
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Moderacja/ })
    .click();

  const toolbar = page
    .locator(".admin-toolbar")
    .filter({ has: page.getByRole("tablist", { name: "Sekcje moderacji" }) });
  await expect(toolbar.getByRole("tab", { name: /Zdjęcia/ })).toBeVisible();
  await expect(toolbar.getByRole("tab", { name: /Do sprawdzenia/ })).toBeVisible();
  await expect(toolbar.getByRole("tab", { name: /Odrzucone/ })).toBeVisible();
  await expect(toolbar.getByRole("tab", { name: /Wszystkie/ })).toHaveCount(0);
  await expect(toolbar.getByRole("tab", { name: /Zatwierdzone/ })).toHaveCount(0);
  await expect(toolbar.getByRole("button", { name: "Dodaj zdjęcie" })).toHaveCount(0);
  await expect(page.locator(".photo-queue-toolbar")).toHaveCount(0);
});

test("admin moderation badges use backend totals beyond loaded media page", async ({ page }) => {
  const loadedPhotos: AdminPhoto[] = Array.from({ length: 100 }, (_, index) => ({
    ...rynekCover,
    caption: `Załadowane zdjęcie ${index + 1}`,
    id: `loaded-photo-${index + 1}`,
    status: "approved",
  }));
  const pendingPhoto: AdminPhoto = {
    ...rynekCover,
    caption: "Zdjęcie do sprawdzenia",
    id: "pending-photo-from-status-query",
    status: "pending",
  };

  await mockAdminApi(page, {
    adminModerationCounts: {
      memories: { all: 0, approved: 0, pending: 0, rejected: 0 },
      photos: { all: 1176, approved: 1150, pending: 23, rejected: 3 },
      reports: { all: 2, closed: 0, open: 2 },
    },
    adminPhotoList: [...loadedPhotos, pendingPhoto],
  });
  await unlockAdmin(page);
  await clickAdminSection(page, /Moderacja/);

  const photoStatusTabs = page.getByRole("tablist", { name: "Status zdjęć" });
  await expect(photoStatusTabs.getByRole("tab", { name: /Do sprawdzenia 23/ })).toBeVisible();
  await expect(photoStatusTabs.getByRole("tab", { name: /Odrzucone 3/ })).toBeVisible();
  await expect(photoStatusTabs.getByRole("tab", { name: /Wszystkie/ })).toHaveCount(0);
  await expect(photoStatusTabs.getByRole("tab", { name: /Zatwierdzone/ })).toHaveCount(0);

  const moderationSections = page.getByRole("tablist", { name: "Sekcje moderacji" });
  await expect(moderationSections.getByRole("tab", { name: /Zdjęcia 26/ })).toBeVisible();
  await expect(moderationSections.getByRole("tab", { name: /Zgłoszenia 2/ })).toBeVisible();

  await photoStatusTabs.getByRole("tab", { name: /Do sprawdzenia 23/ }).click();
  await expect(page.getByText("Brak zdjęć dla wybranego statusu.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Pokaż media miasta ${city.name}` })).toBeVisible();
});

test("admin moderation media groups start collapsed", async ({ page }) => {
  await mockAdminApi(page, {
    adminPhotoList: [
      { ...rynekCover, id: "pending-rynek-cover", status: "pending" as const },
      { ...nadodrzeCover, id: "pending-nadodrze-cover", status: "pending" as const },
    ],
  });
  await unlockAdmin(page);
  await clickAdminSection(page, /Moderacja/);

  await expect(page.getByRole("button", { name: `Pokaż media miasta ${city.name}` })).toBeVisible();
  await expect(page.locator(".admin-media-album")).toHaveCount(0);

  await page.getByRole("button", { name: `Pokaż media miasta ${city.name}` }).click();
  await expect(page.getByRole("button", { name: `Zwiń media miasta ${city.name}` })).toBeVisible();
  await expect(page.locator(".admin-media-album")).toHaveCount(2);
});

test("visual: admin city lists share one panel and row contract", async ({ page }) => {
  const probes: Record<"places" | "moderation", AdminListProbe> = {
    moderation: {
      panelSelector: ".admin-media-city-albums.admin-list-panel",
      rowSelector: ".admin-list-group-row",
      sectionName: /Moderacja/,
    },
    places: {
      panelSelector: ".place-table.admin-list-panel",
      rowSelector: ".admin-list-group-row",
      sectionName: /Miejsca/,
    },
  };
  const viewports = [
    { height: 900, label: "desktop", width: 1400 },
    { height: 900, label: "tablet", width: 820 },
    { height: 740, label: "mobile", width: 390 },
  ];

  await mockAdminApi(page, {
    adminPhotoList: [
      { ...rynekCover, id: "pending-rynek-cover", status: "pending" as const },
      { ...nadodrzeCover, id: "pending-nadodrze-cover", status: "pending" as const },
    ],
  });
  await unlockAdmin(page);

  for (const viewport of viewports) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });

    await clickAdminSection(page, probes.places.sectionName);
    const placesPanel = page.locator(probes.places.panelSelector);
    await expect(placesPanel).toBeVisible();
    await expect(placesPanel.locator(probes.places.rowSelector).first()).toBeVisible();
    await expect(placesPanel.locator(".place-city-meta-item--zoom").first()).toBeVisible();
    await expect(placesPanel.locator(".place-city-meta-item--coordinates").first()).toBeVisible();
    const placesStyles = await getAdminListStyleSnapshot(placesPanel, probes.places.rowSelector);
    await expect(page).toHaveScreenshot(`admin-list-consistency-places-${viewport.label}.png`, SNAPSHOT_OPTIONS);

    await clickAdminSection(page, probes.moderation.sectionName);
    const moderationPanel = page.locator(probes.moderation.panelSelector);
    await expect(moderationPanel).toBeVisible();
    await expect(moderationPanel.locator(probes.moderation.rowSelector).first()).toBeVisible();
    const moderationStyles = await getAdminListStyleSnapshot(moderationPanel, probes.moderation.rowSelector);
    await expect(page).toHaveScreenshot(`admin-list-consistency-moderation-${viewport.label}.png`, SNAPSHOT_OPTIONS);

    expect(moderationStyles.panel).toEqual(placesStyles.panel);
    expect({
      ...moderationStyles.row,
      height: placesStyles.row.height,
    }).toEqual(placesStyles.row);

    if (viewport.width >= 761) {
      expect(
        Math.abs(moderationStyles.row.height - placesStyles.row.height),
        `${viewport.label}: ${JSON.stringify({ moderation: moderationStyles.row, places: placesStyles.row })}`,
      ).toBeLessThanOrEqual(1);
    }
  }
});

test("admin category manager modal uses the shared toolbar contract", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1400 });
  await mockAdminApi(page);
  await unlockAdmin(page);
  await clickAdminSection(page, /Miejsca/);

  await page.getByRole("button", { name: "Dodaj miejsce" }).click();
  await page
    .getByRole("dialog", { name: "Dodaj miejsce" })
    .getByRole("button", { name: "Zarządzaj kategoriami" })
    .click();

  const dialog = page.getByRole("dialog", { name: /Zarządzaj kategoriami/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".category-toolbar")).toHaveCount(0);

  const toolbar = dialog.locator(".admin-toolbar");
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByText(/Wszystkie/)).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Dodaj kategorię" })).toBeVisible();
  await expectAdminPillGeometryIn(toolbar, page);
});

test("admin places toolbar exposes category manager directly", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1400 });
  await mockAdminApi(page);
  await unlockAdmin(page);
  await clickAdminSection(page, /Miejsca/);

  await page.locator(".places-manager .admin-toolbar").getByRole("button", { name: "Zarządzaj kategoriami" }).click();

  const dialog = page.getByRole("dialog", { name: /Zarządzaj kategoriami/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".category-row").filter({ hasText: categories[0].label })).toBeVisible();
});

test("admin place edit modal uses the wide system modal layout", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1600 });
  await mockAdminApi(page);
  await unlockAdmin(page);
  await clickAdminSection(page, /Miejsca/);

  const cityToggle = page.locator(".place-city-toggle").filter({ hasText: city.name });
  await cityToggle.click();
  const placeRow = page.locator(".place-city-group .table-row").filter({ hasText: adminPlaces[0].title });
  await placeRow.getByRole("button", { name: `Edytuj miejsce ${adminPlaces[0].title}` }).click();

  const editDialog = page.getByRole("dialog", { name: "Edytuj miejsce" });
  await expect(editDialog).toBeVisible();
  const editDialogBox = await getRoundedBox(editDialog);
  expect(editDialogBox.width).toBeGreaterThanOrEqual(1000);
  expect(editDialogBox.right).toBeLessThanOrEqual(1600);
});

test("admin place photo gallery exposes moderator tools in responsive media viewer", async ({ page }) => {
  test.setTimeout(60_000);

  const adminPhotoList = [
    {
      ...rynekCover,
      attribution_author: "Scotch Mist",
      attribution_license: "CC BY-SA 4.0",
      attribution_license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
      attribution_source_url: "https://example.com/source",
      caption: "Krótki podpis zdjęcia Rynku",
      description_blocks: [
        {
          type: "paragraph" as const,
          text: "Długi opis zdjęcia przygotowany do czytania i TTS. Powinien otwierać się jako osobna warstwa, a nie mieszać z krótkim podpisem zdjęcia.",
        },
      ],
    },
    rynekSide,
    ...Array.from({ length: 3 }, (_, index) => ({
      ...rynekCover,
      caption: `Dodatkowe zdjęcie ${index + 1}`,
      id: `visual-rynek-extra-${index + 1}`,
      public_path: `/media/visual/visual-rynek-extra-${index + 1}.svg`,
      thumb_path: `/media/visual/visual-rynek-extra-${index + 1}-thumb.svg`,
    })),
  ];

  await mockAdminApi(page, { adminPhotoList });

  async function openPhotoGallery(width: number, height: number) {
    await page.setViewportSize({ height, width });
    await unlockAdmin(page);
    await clickAdminSection(page, /Miejsca/);

    const cityToggle = page.locator(".place-city-toggle").filter({ hasText: city.name });
    await cityToggle.click();
    const placeRow = page.locator(".place-city-group .table-row").filter({ hasText: adminPlaces[0].title });
    await placeRow.getByRole("button", { name: `Galeria zdjęć miejsca ${adminPlaces[0].title}` }).click();

    const photoPanelDialog = page.getByRole("dialog", { name: "Zdjęcia miejsca" });
    await expect(photoPanelDialog).toBeVisible();

    if (width >= 1200) {
      const panelBox = await getRoundedBox(photoPanelDialog);
      expect(panelBox.width).toBeGreaterThanOrEqual(1400);

      const photoCards = photoPanelDialog.locator(".place-photo-strip .admin-media-item");
      await expect(photoCards).toHaveCount(adminPhotoList.length);
      const cardBoxes = await getRoundedBoxes(photoCards);
      const firstRowTop = cardBoxes[0].top;
      expect(cardBoxes.filter((box) => Math.abs(box.top - firstRowTop) <= 1)).toHaveLength(adminPhotoList.length);

      const firstPhotoCard = photoCards.first();
      await expect(firstPhotoCard).toContainText("Krótki podpis zdjęcia Rynku");
      await expect(firstPhotoCard).not.toContainText("Długi opis zdjęcia przygotowany");
      const cardActionButtons = firstPhotoCard.locator(".admin-media-card-actions button");
      await expect(cardActionButtons).toHaveCount(5);
      await expect(cardActionButtons.first()).toHaveText("");
      await expect(cardActionButtons.first()).toHaveAttribute("aria-label", "Podgląd");
      await expect(cardActionButtons.first()).toHaveAttribute("title", "Podgląd");

      const actionBoxes = await getRoundedBoxes(cardActionButtons);
      const actionTop = actionBoxes[0].top;
      for (const box of actionBoxes) {
        expect(Math.abs(box.top - actionTop)).toBeLessThanOrEqual(1);
        expect(box.width).toBeLessThanOrEqual(40);
      }

      const attributionItems = firstPhotoCard.locator(".admin-photo-attribution > *");
      await expect(attributionItems).toHaveCount(4);
      const attributionBoxes = await getRoundedBoxes(attributionItems);
      expect(Math.abs(attributionBoxes[0].top - attributionBoxes[1].top)).toBeLessThanOrEqual(1);
      expect(attributionBoxes[2].top).toBeGreaterThan(attributionBoxes[0].top);
    }

    await photoPanelDialog
      .getByRole("button", { name: `Otwórz galerię zdjęć miejsca ${adminPlaces[0].title}` })
      .first()
      .click();

    const galleryDialog = page.getByRole("dialog", { name: "Galeria zdjęć" });
    await expect(galleryDialog).toBeVisible();
    await expect(galleryDialog.getByRole("button", { name: "Pełny ekran" })).toBeVisible();
    await expect(galleryDialog.getByRole("button", { name: "Pokaż opis zdjęcia" })).toBeVisible();
    await expect(galleryDialog.getByRole("button", { name: "Anonimizuj" })).toBeVisible();
    await expect(galleryDialog.getByRole("button", { name: "Edytuj tekst" })).toBeVisible();
    await expect(galleryDialog.locator(".admin-photo-gallery-sidebar")).toBeVisible();
    await expect(galleryDialog.locator(".admin-photo-gallery-copy")).toContainText("Krótki podpis zdjęcia Rynku");
    await expect(galleryDialog.locator(".admin-photo-gallery-copy")).not.toContainText(
      "Długi opis zdjęcia przygotowany",
    );

    await galleryDialog.getByRole("button", { name: "Pokaż opis zdjęcia" }).click();
    await expect(galleryDialog.locator(".admin-photo-gallery-description")).toContainText(
      "Długi opis zdjęcia przygotowany",
    );
    const descriptionOverlay = await galleryDialog.evaluate((element) => {
      const modalRect = element.getBoundingClientRect();
      const header = element.querySelector(".system-modal-header");
      const description = element.querySelector(".admin-photo-gallery-description");
      const descriptionRect = description?.getBoundingClientRect();
      const descriptionStyle = description ? window.getComputedStyle(description) : null;
      const headerStyle = header ? window.getComputedStyle(header) : null;
      return {
        borderTopWidth: descriptionStyle?.borderTopWidth,
        bottomDelta: Math.abs((descriptionRect?.bottom ?? 0) - modalRect.bottom),
        headerZIndex: headerStyle?.zIndex,
        leftDelta: Math.abs((descriptionRect?.left ?? 0) - modalRect.left),
        overlayZIndex: descriptionStyle?.zIndex,
        rightDelta: Math.abs((descriptionRect?.right ?? 0) - modalRect.right),
        topDelta: Math.abs((descriptionRect?.top ?? 0) - modalRect.top),
      };
    });
    expect(descriptionOverlay.borderTopWidth).toBe("0px");
    expect(descriptionOverlay.headerZIndex).toBe("5");
    expect(descriptionOverlay.overlayZIndex).toBe("2");
    expect(descriptionOverlay.leftDelta).toBeLessThanOrEqual(2);
    expect(descriptionOverlay.rightDelta).toBeLessThanOrEqual(2);
    expect(descriptionOverlay.topDelta).toBeLessThanOrEqual(2);
    expect(descriptionOverlay.bottomDelta).toBeLessThanOrEqual(2);
    await expect(
      galleryDialog
        .locator(".admin-photo-gallery-description p")
        .first()
        .evaluate((element) => {
          const style = window.getComputedStyle(element);
          return {
            color: style.color,
            fontSize: style.fontSize,
            textShadow: style.textShadow,
          };
        }),
    ).resolves.toEqual({
      color: "rgb(3, 7, 12)",
      fontSize: "15px",
      textShadow: "none",
    });
    await expect(galleryDialog.locator(".admin-photo-gallery-overlay")).not.toBeVisible();
    await galleryDialog.getByRole("button", { name: "Ukryj opis zdjęcia" }).click();
    await expect(galleryDialog.locator(".admin-photo-gallery-overlay")).toBeVisible();

    const galleryBox = await getRoundedBox(galleryDialog);
    expect(galleryBox.left).toBeGreaterThanOrEqual(0);
    expect(galleryBox.top).toBeGreaterThanOrEqual(0);
    expect(galleryBox.right).toBeLessThanOrEqual(width);
    expect(galleryBox.bottom).toBeLessThanOrEqual(height);
    await expect(
      galleryDialog
        .locator(".admin-photo-gallery-image")
        .evaluate((element) => window.getComputedStyle(element).objectFit),
    ).resolves.toBe("cover");

    if (width >= 900) {
      await galleryDialog.getByRole("button", { name: "Następne zdjęcie" }).click();
      await expect(galleryDialog.getByText("2/5")).toBeVisible();
    }
  }

  await openPhotoGallery(1600, 900);
  await openPhotoGallery(390, 740);
});

test("admin single-photo place gallery keeps the card and media tools compact", async ({ page }) => {
  test.setTimeout(60_000);

  await page.setViewportSize({ height: 900, width: 1600 });
  await mockAdminApi(page, { adminPhotoList: [rynekCover] });
  await unlockAdmin(page);
  await clickAdminSection(page, /Miejsca/);

  const cityToggle = page.locator(".place-city-toggle").filter({ hasText: city.name });
  await cityToggle.click();
  const placeRow = page.locator(".place-city-group .table-row").filter({ hasText: adminPlaces[0].title });
  await placeRow.getByRole("button", { name: `Galeria zdjęć miejsca ${adminPlaces[0].title}` }).click();

  const photoPanelDialog = page.getByRole("dialog", { name: "Zdjęcia miejsca" });
  await expect(photoPanelDialog).toBeVisible();
  const panelMetrics = await photoPanelDialog.evaluate((element) => {
    const card = element.querySelector(".place-photo-strip .admin-media-item");
    const cardRect = card?.getBoundingClientRect();
    const modalRect = element.getBoundingClientRect();
    const addCards = Array.from(element.querySelectorAll(".place-photo-add-card")).map((addCard) => {
      const rect = addCard.getBoundingClientRect();
      return {
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
      };
    });
    return {
      cardWidth: Math.round(cardRect?.width ?? 0),
      modalWidth: Math.round(modalRect.width),
      modalScrollDelta: Math.round(element.scrollHeight - element.clientHeight),
      addCardCount: addCards.length,
      addCardHeightDelta: Math.max(
        0,
        ...addCards.map((addCard) => Math.abs(addCard.height - Math.round(cardRect?.height ?? 0))),
      ),
      addCardTopDelta: Math.max(
        0,
        ...addCards.map((addCard) => Math.abs(addCard.top - Math.round(cardRect?.top ?? 0))),
      ),
      addCardWidthDelta: Math.max(
        0,
        ...addCards.map((addCard) => Math.abs(addCard.width - Math.round(cardRect?.width ?? 0))),
      ),
    };
  });
  expect(panelMetrics.cardWidth).toBeGreaterThanOrEqual(260);
  expect(panelMetrics.cardWidth).toBeLessThanOrEqual(340);
  expect(panelMetrics.modalWidth).toBeGreaterThanOrEqual(600);
  expect(panelMetrics.modalWidth).toBeLessThanOrEqual(660);
  expect(panelMetrics.addCardCount).toBe(1);
  expect(panelMetrics.addCardHeightDelta).toBeLessThanOrEqual(1);
  expect(panelMetrics.addCardTopDelta).toBeLessThanOrEqual(1);
  expect(panelMetrics.addCardWidthDelta).toBeLessThanOrEqual(1);
  expect(panelMetrics.modalScrollDelta).toBeLessThanOrEqual(1);

  await page.setViewportSize({ height: 740, width: 390 });
  await expect(photoPanelDialog).toBeVisible();
  const mobilePanelMetrics = await photoPanelDialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const grid = element.querySelector(".place-photo-strip");
    const gridStyle = grid ? window.getComputedStyle(grid) : null;
    return {
      addCardCount: element.querySelectorAll(".place-photo-add-card").length,
      cardCount: element.querySelectorAll(".place-photo-strip .admin-media-item").length,
      gridColumnCount: gridStyle?.gridTemplateColumns.split(" ").filter(Boolean).length ?? 0,
      modalScrollDelta: Math.round(element.scrollHeight - element.clientHeight),
      modalWidth: Math.round(rect.width),
    };
  });
  expect(mobilePanelMetrics.cardCount).toBe(1);
  expect(mobilePanelMetrics.addCardCount).toBe(1);
  expect(mobilePanelMetrics.gridColumnCount).toBe(1);
  expect(mobilePanelMetrics.modalWidth).toBeLessThanOrEqual(342);
  expect(mobilePanelMetrics.modalScrollDelta).toBeLessThanOrEqual(1);

  await photoPanelDialog.getByRole("button", { name: `Otwórz galerię zdjęć miejsca ${adminPlaces[0].title}` }).click();

  const galleryDialog = page.getByRole("dialog", { name: "Galeria zdjęć" });
  await expect(galleryDialog).toBeVisible();
  await page.setViewportSize({ height: 740, width: 390 });
  await expect(galleryDialog.locator(".admin-photo-gallery-sidebar")).toBeVisible();

  const sidebarMetrics = await galleryDialog.locator(".admin-photo-gallery-sidebar").evaluate((element) => {
    const style = window.getComputedStyle(element);
    const fileInput = element.querySelector(".file-input-control");
    const fileInputStyle = fileInput ? window.getComputedStyle(fileInput) : null;
    const labelRow = element.querySelector(".ui-setting-field-label-row");
    const labelRowRect = labelRow?.getBoundingClientRect();
    return {
      backgroundColor: style.backgroundColor,
      fileInputBackgroundColor: fileInputStyle?.backgroundColor ?? "",
      hintButtonCount: element.querySelectorAll(".ui-field-hint-trigger").length,
      labelRowHeight: Math.round(labelRowRect?.height ?? 0),
      overflowY: style.overflowY,
      scrollDelta: Math.round(element.scrollHeight - element.clientHeight),
    };
  });
  expect(sidebarMetrics.backgroundColor).toContain("rgba(16, 18, 22");
  expect(sidebarMetrics.fileInputBackgroundColor).toContain("rgba(39, 39, 42");
  expect(sidebarMetrics.hintButtonCount).toBe(0);
  expect(sidebarMetrics.labelRowHeight).toBeLessThanOrEqual(1);
  expect(sidebarMetrics.overflowY).toBe("visible");
  expect(sidebarMetrics.scrollDelta).toBeLessThanOrEqual(1);
});

test("admin main section tabs keep stable geometry across all sections", async ({ page }) => {
  const sections: AdminSectionTabGeometrySection[] = [
    { contentSelector: ".place-table", sectionName: /Miejsca/ },
    { contentSelector: ".photo-queue", sectionName: /Moderacja/ },
    { contentSelector: ".guide-list", sectionName: /Trasy/ },
    { contentSelector: ".admin-config-form", sectionName: /Konfiguracja/ },
  ];
  let baselineNavBox: Awaited<ReturnType<typeof getRoundedBox>> | null = null;
  let baselineTabBoxes: Awaited<ReturnType<typeof getRoundedBoxes>> | null = null;

  await page.setViewportSize({ height: 900, width: 1400 });
  await mockAdminApi(page);
  await unlockAdmin(page);

  const nav = page.getByRole("navigation", { name: "Sekcje panelu admina" });
  const expectedTabHeight = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--admin-section-tab-min-height")),
  );

  for (const section of sections) {
    await clickAdminSection(page, section.sectionName);
    await expect(page.locator(section.contentSelector).first()).toBeVisible();

    const navBox = await getRoundedBox(nav);
    const tabBoxes = await getRoundedBoxes(nav.locator(".admin-section-tab"));
    expect(tabBoxes).toHaveLength(sections.length);
    const activeBox = await getRoundedBox(nav.locator(".admin-section-tab.is-active"));

    for (const tabBox of tabBoxes) {
      expect(tabBox.height).toBe(Math.round(expectedTabHeight));
      expect(Math.abs(tabBox.top - tabBoxes[0].top)).toBeLessThanOrEqual(1);
    }
    expect(activeBox.height).toBe(Math.round(expectedTabHeight));

    if (!baselineNavBox || !baselineTabBoxes) {
      baselineNavBox = navBox;
      baselineTabBoxes = tabBoxes;
      continue;
    }

    expect(Math.abs(navBox.left - baselineNavBox.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(navBox.right - baselineNavBox.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(navBox.top - baselineNavBox.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(navBox.height - baselineNavBox.height)).toBeLessThanOrEqual(1);

    for (const [index, tabBox] of tabBoxes.entries()) {
      const baselineTabBox = baselineTabBoxes[index];
      expect(Math.abs(tabBox.left - baselineTabBox.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(tabBox.right - baselineTabBox.right)).toBeLessThanOrEqual(1);
      expect(Math.abs(tabBox.top - baselineTabBox.top)).toBeLessThanOrEqual(1);
      expect(Math.abs(tabBox.height - baselineTabBox.height)).toBeLessThanOrEqual(1);
    }
  }
});

test("admin status pills keep stable geometry across sections and filters", async ({ page }) => {
  const sections: AdminPillGeometrySection[] = [
    {
      contentSelector: ".place-table",
      sectionName: /Miejsca/,
      statusTablistName: "Status miejsc",
      statusTabName: /Opublikowane/,
    },
    {
      contentSelector: ".photo-queue",
      sectionName: /Moderacja/,
      statusTablistName: "Status zdjęć",
      statusTabName: /Do sprawdzenia/,
    },
    {
      contentSelector: ".guide-list",
      sectionName: /Trasy/,
      statusTablistName: "Status tras",
      statusTabName: /Opublikowane/,
    },
  ];
  let baselineActionRight: number | null = null;
  let baselinePrimaryLeft: number | null = null;
  let baselineToolbarTop: number | null = null;

  await page.setViewportSize({ height: 900, width: 1400 });
  await mockAdminApi(page);
  await unlockAdmin(page);
  const expectedHeight = await page.evaluate(() =>
    Math.round(Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--admin-pill-height"))),
  );

  for (const section of sections) {
    await clickAdminSection(page, section.sectionName);
    const toolbar = page.locator(".admin-toolbar").first();
    await expect(toolbar).toBeVisible();
    await expect(page.locator(section.contentSelector).first()).toBeVisible();
    await expectAdminPillGeometry(page);

    const actionBox = await getRoundedBox(toolbar.locator(".admin-toolbar-actions"));
    const filterSlot = toolbar.locator(".admin-toolbar-action-slot--filter");
    const hasFilterSlot = (await filterSlot.count()) > 0;
    const filterSlotBox = hasFilterSlot ? await getRoundedBox(filterSlot) : null;
    const filterButtonBox = hasFilterSlot ? await getRoundedBox(filterSlot.locator(".admin-icon-action")) : null;
    const primaryBox = await getRoundedBox(toolbar.locator(".admin-toolbar-primary"));

    const toolbarTop = await getRoundedTop(page, ".admin-toolbar");
    baselineToolbarTop ??= toolbarTop;
    expect(Math.abs(toolbarTop - baselineToolbarTop)).toBeLessThanOrEqual(1);
    baselinePrimaryLeft ??= primaryBox.left;
    baselineActionRight ??= actionBox.right;
    expect(Math.abs(primaryBox.left - baselinePrimaryLeft)).toBeLessThanOrEqual(1);
    expect(Math.abs(actionBox.right - baselineActionRight)).toBeLessThanOrEqual(1);
    if (filterSlotBox && filterButtonBox) {
      expect(filterSlotBox.width).toBe(filterButtonBox.width);
      expect(filterButtonBox.height).toBe(Math.round(expectedHeight));
    }

    const contentTopBefore = await getRoundedTop(page, section.contentSelector);
    if (section.statusTablistName && section.statusTabName) {
      await page
        .getByRole("tablist", { name: section.statusTablistName })
        .getByRole("tab", { name: section.statusTabName })
        .click();
    }
    await expectAdminPillGeometry(page);
    const nextActionBox = await getRoundedBox(toolbar.locator(".admin-toolbar-actions"));
    const nextFilterSlotBox = hasFilterSlot ? await getRoundedBox(filterSlot) : null;
    const nextPrimaryBox = await getRoundedBox(toolbar.locator(".admin-toolbar-primary"));
    expect(Math.abs(nextPrimaryBox.left - primaryBox.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(nextActionBox.right - actionBox.right)).toBeLessThanOrEqual(1);
    if (filterSlotBox && nextFilterSlotBox) {
      expect(Math.abs(nextFilterSlotBox.left - filterSlotBox.left)).toBeLessThanOrEqual(1);
    }
    const contentTopAfter = await getRoundedTop(page, section.contentSelector);
    expect(Math.abs(contentTopAfter - contentTopBefore)).toBeLessThanOrEqual(1);
  }
});

test("admin guide status tabs filter the list", async ({ page }) => {
  const guideList = [
    { ...adminGuides[0], id: "guide-published", status: "published", title: "Trasa opublikowana" },
    { ...adminGuides[1], id: "guide-draft", status: "draft", title: "Trasa szkicowa" },
    { ...adminGuides[2], id: "guide-archived", status: "archived", title: "Trasa archiwalna" },
  ];

  await mockAdminApi(page, { adminGuideList: guideList });
  await page.goto("/");
  await page.evaluate((token) => window.sessionStorage.setItem("photomaps_admin_token", token), ADMIN_TOKEN);
  await page.goto("/admin");
  await page.getByRole("navigation", { name: "Sekcje panelu admina" }).getByRole("button", { name: /Trasy/ }).click();

  const statusTabs = page.getByRole("tablist", { name: "Status tras" });
  await statusTabs.getByRole("tab", { name: /Szkice 1/ }).click();
  await expect(page.locator(".guide-row").filter({ hasText: "Trasa szkicowa" })).toBeVisible();
  await expect(page.locator(".guide-row").filter({ hasText: "Trasa opublikowana" })).toHaveCount(0);
  await expect(page.locator(".guide-row").filter({ hasText: "Trasa archiwalna" })).toHaveCount(0);

  await statusTabs.getByRole("tab", { name: /Archiwalne 1/ }).click();
  await expect(page.locator(".guide-row").filter({ hasText: "Trasa archiwalna" })).toBeVisible();
  await expect(page.locator(".guide-row").filter({ hasText: "Trasa szkicowa" })).toHaveCount(0);
});

test("admin configuration separates application settings and maintenance", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/");
  await page.evaluate((token) => window.sessionStorage.setItem("photomaps_admin_token", token), ADMIN_TOKEN);
  await page.goto("/admin");
  await expect(
    page.getByRole("navigation", { name: "Sekcje panelu admina" }).getByRole("button", { name: /Ustawienia/ }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: /Konfiguracja/ })
    .click();

  const configSections = page.getByRole("tablist", { name: "Sekcje konfiguracji" });
  await expect(configSections).toBeVisible();
  await expect(page.locator(".admin-config-form")).toBeVisible();
  await expect(page.locator(".admin-maintenance-panel")).toHaveCount(0);

  await configSections.getByRole("tab", { name: "Utrzymanie" }).click();
  await expect(page.locator(".admin-config-form")).toHaveCount(0);
  await expect(page.locator(".admin-maintenance-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Odśwież" })).toBeVisible();
});
