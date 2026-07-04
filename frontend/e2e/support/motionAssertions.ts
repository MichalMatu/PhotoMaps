import { expect, type Locator } from "@playwright/test";

export async function expectAnimationName(locator: Locator, expectedAnimationName: string) {
  await expect
    .poll(async () => {
      return locator.evaluate((element) => window.getComputedStyle(element).animationName);
    })
    .toContain(expectedAnimationName);
}

export async function expectExitPhase(locator: Locator) {
  await expect
    .poll(async () => {
      return locator
        .first()
        .evaluate((element) => element.classList.contains("is-exiting"))
        .catch(() => false);
    })
    .toBe(true);
}
