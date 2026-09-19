import type { RectLike, ResolvedPinnedMediaCard } from "./pinnedMediaBoardTypes";

export function measurePinnedMediaCardRects(
  cards: ResolvedPinnedMediaCard[],
  cardElements: Map<string, HTMLElement>,
): Record<string, RectLike> {
  const nextRects: Record<string, RectLike> = {};

  for (const card of cards) {
    const element = cardElements.get(card.id);
    if (!element) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    nextRects[card.id] = {
      height: Math.round(rect.height),
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
    };
  }

  return nextRects;
}

export function rectRecordsEqual(first: Record<string, RectLike>, second: Record<string, RectLike>) {
  return JSON.stringify(first) === JSON.stringify(second);
}
