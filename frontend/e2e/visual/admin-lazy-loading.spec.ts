import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { ADMIN_TOKEN } from "../support/config";
import { mockAdminApi } from "../support/visualApi";

async function unlockAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();
  await expect(page.getByRole("navigation", { name: "Sekcje panelu admina" })).toBeVisible();
}

async function clickAdminSection(page: Page, sectionName: RegExp) {
  await page
    .getByRole("navigation", { name: "Sekcje panelu admina" })
    .getByRole("button", { name: sectionName })
    .click();
}

test("admin loads hidden section queues only when they are opened", async ({ page }) => {
  const requests = { guides: 0, memories: 0, reports: 0 };
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/admin/guides") requests.guides += 1;
    if (pathname === "/api/admin/memories") requests.memories += 1;
    if (pathname === "/api/admin/reports") requests.reports += 1;
  });

  await mockAdminApi(page);
  await unlockAdmin(page);
  await expect.poll(() => requests).toEqual({ guides: 0, memories: 0, reports: 0 });

  await clickAdminSection(page, /Trasy/);
  await expect.poll(() => requests.guides).toBe(1);
  await clickAdminSection(page, /Miejsca/);
  await clickAdminSection(page, /Trasy/);
  await page.waitForTimeout(100);
  expect(requests.guides).toBe(1);

  await clickAdminSection(page, /Moderacja/);
  await page.waitForTimeout(100);
  expect(requests.memories).toBe(0);
  expect(requests.reports).toBe(0);

  const moderationSections = page.getByRole("group", { name: "Sekcje moderacji" });
  await moderationSections.getByRole("button", { name: /Pamiątki/ }).click();
  await expect.poll(() => requests.memories).toBe(1);
  await moderationSections.getByRole("button", { name: /Zdjęcia/ }).click();
  await moderationSections.getByRole("button", { name: /Pamiątki/ }).click();
  await page.waitForTimeout(100);
  expect(requests.memories).toBe(1);

  await moderationSections.getByRole("button", { name: /Zgłoszenia/ }).click();
  await expect.poll(() => requests.reports).toBe(1);
  await moderationSections.getByRole("button", { name: /Zdjęcia/ }).click();
  await moderationSections.getByRole("button", { name: /Zgłoszenia/ }).click();
  await page.waitForTimeout(100);
  expect(requests.reports).toBe(1);
});
