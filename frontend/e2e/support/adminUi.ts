import { expect, type Locator, type Page } from "@playwright/test";

import { ADMIN_TOKEN } from "./config";

export async function unlockAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Wejdź do panelu" }).click();

  const adminTabs = page.getByRole("navigation", { name: "Sekcje panelu admina" });
  await expect(adminTabs).toBeVisible();
  return adminTabs;
}

export async function openAdminModerationSection(page: Page, adminTabs: Locator, sectionName: RegExp) {
  await adminTabs.getByRole("button", { name: /Moderacja/ }).click();
  await page.getByRole("tab", { name: sectionName }).click();
}

export async function openStatusTab(page: Page, name: RegExp) {
  await page.getByRole("tab", { name }).click();
}

export async function expandPlaceCityGroup(page: Page, cityName: string) {
  const cityToggle = page.locator(".place-city-toggle").filter({ hasText: cityName });
  await expect(cityToggle).toBeVisible();
  if ((await cityToggle.getAttribute("aria-expanded")) !== "true") {
    await cityToggle.click();
  }
  await expect(cityToggle).toHaveAttribute("aria-expanded", "true");
}
