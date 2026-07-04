import { expect, type Page } from "@playwright/test";

export async function clickMapMarker(page: Page, title: string) {
  const marker = page.locator(`[title="${title}"]`).first();
  await expect(marker).toBeVisible();
  await marker.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        view: window,
      }),
    );
  });
}
