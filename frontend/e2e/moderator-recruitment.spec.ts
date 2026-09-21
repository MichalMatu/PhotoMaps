import { expect, test } from "@playwright/test";

import { mockSharedApi } from "./support/visualApi";

test("moderator recruitment prompt closes from its top-right button", async ({ page }) => {
  await mockSharedApi(page, undefined, undefined, undefined, false);
  await page.goto("/");

  const prompt = page.getByRole("dialog", { name: "Szukam moderatorów" });
  await expect(prompt).toBeVisible();

  const close = prompt.getByRole("button", { name: "Zamknij zaproszenie" });
  await expect(close).toBeVisible();

  const promptBox = await prompt.boundingBox();
  const closeBox = await close.boundingBox();
  expect(promptBox).not.toBeNull();
  expect(closeBox).not.toBeNull();
  expect(closeBox?.width).toBeGreaterThanOrEqual(34);
  expect(closeBox?.height).toBeGreaterThanOrEqual(34);
  expect((closeBox?.x ?? 0) + (closeBox?.width ?? 0)).toBeLessThanOrEqual(
    (promptBox?.x ?? 0) + (promptBox?.width ?? 0),
  );
  expect(closeBox?.y ?? 0).toBeGreaterThanOrEqual(promptBox?.y ?? 0);

  await close.click();
  await expect(prompt).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("photomap:moderator-recruitment:v1")))
    .toBe("dismissed");
});
