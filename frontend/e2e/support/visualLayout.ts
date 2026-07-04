import type { Page } from "@playwright/test";

export async function guideCardRows(page: Page) {
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

export async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}
