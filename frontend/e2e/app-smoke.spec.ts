import { expect, test } from "@playwright/test";

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
