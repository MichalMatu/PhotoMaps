import type { PlaceMapItem } from "../../api/client";
import { findPlaceFanItem, type PlaceMapVisualItem } from "./placePreview";

export const PINNED_MEDIA_STORAGE_KEY = "photomap:pinned-media-board:v1";
export const MAX_PINNED_MEDIA_CARDS = 8;
const PINNED_MEDIA_FRAME_MARGIN = 12;
const PINNED_MEDIA_SNAP_THRESHOLD = 12;
const PINNED_MEDIA_CARD_CHROME_HEIGHT = 72;

const DEFAULT_ASPECT_RATIO = 16 / 10;
const MIN_CARD_WIDTH = 180;
const MAX_CARD_WIDTH = 360;

type PinnedMediaKind = PlaceMapVisualItem["kind"];

export type PinnedMediaBounds = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type RectLike = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type PinnedMediaLayout = {
  aspectRatio: number;
  height: number;
  width: number;
  x: number;
  y: number;
  zIndex: number;
};

export type StoredPinnedMediaCard = {
  createdAt: number;
  id: string;
  itemId: string;
  kind: PinnedMediaKind;
  layout: PinnedMediaLayout;
  placeId: string;
};

export type ResolvedPinnedMediaCard = StoredPinnedMediaCard & {
  item: PlaceMapVisualItem;
  place: PlaceMapItem;
};

type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

type PinDraft = {
  aspectRatio?: number | null;
  itemId: string;
  kind: PinnedMediaKind;
  placeId: string;
  sourceRect?: RectLike | null;
};

type PinResult =
  | { cards: StoredPinnedMediaCard[]; status: "added" | "updated" }
  | { cards: StoredPinnedMediaCard[]; status: "limit" };

type StoredPayload = {
  cards: StoredPinnedMediaCard[];
  version: 1;
};

function pinnedMediaCardId(placeId: string, kind: PinnedMediaKind, itemId: string) {
  return `${placeId}:${kind}:${itemId}`;
}

export function getPinnedMediaBounds(): PinnedMediaBounds {
  if (typeof window === "undefined") {
    return { height: 768, left: 0, top: 0, width: 1024 };
  }

  const mapFrameRect = document.querySelector<HTMLElement>(".map-frame")?.getBoundingClientRect() ?? null;
  const bounds =
    mapFrameRect && mapFrameRect.width > 0 && mapFrameRect.height > 0
      ? mapFrameRect
      : {
          height: window.innerHeight,
          left: 0,
          top: 0,
          width: window.innerWidth,
        };

  return {
    height: roundPixel(bounds.height),
    left: roundPixel(bounds.left),
    top: roundPixel(bounds.top),
    width: roundPixel(bounds.width),
  };
}

export function safeAspectRatio(value: number | null | undefined) {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_ASPECT_RATIO;
  }

  return clamp(value, 0.45, 2.4);
}

function cardTotalHeight(layout: Pick<PinnedMediaLayout, "height">) {
  return layout.height + PINNED_MEDIA_CARD_CHROME_HEIGHT;
}

export function clampPinnedMediaLayout(layout: PinnedMediaLayout, bounds: PinnedMediaBounds): PinnedMediaLayout {
  const aspectRatio = safeAspectRatio(layout.aspectRatio);
  const maxWidth = Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, bounds.width - PINNED_MEDIA_FRAME_MARGIN * 2));
  const minWidth = Math.min(MIN_CARD_WIDTH, maxWidth);
  const maxImageHeight = Math.max(96, bounds.height - PINNED_MEDIA_FRAME_MARGIN * 2 - PINNED_MEDIA_CARD_CHROME_HEIGHT);
  let width = clamp(layout.width, minWidth, maxWidth);
  let height = width / aspectRatio;

  if (height > maxImageHeight) {
    height = maxImageHeight;
    width = height * aspectRatio;
  }

  const minX = bounds.left + PINNED_MEDIA_FRAME_MARGIN;
  const minY = bounds.top + PINNED_MEDIA_FRAME_MARGIN;
  const maxX = Math.max(minX, bounds.left + bounds.width - width - PINNED_MEDIA_FRAME_MARGIN);
  const maxY = Math.max(
    minY,
    bounds.top + bounds.height - height - PINNED_MEDIA_CARD_CHROME_HEIGHT - PINNED_MEDIA_FRAME_MARGIN,
  );

  return {
    aspectRatio,
    height: roundPixel(height),
    width: roundPixel(width),
    x: roundPixel(clamp(layout.x, minX, maxX)),
    y: roundPixel(clamp(layout.y, minY, maxY)),
    zIndex: normalizeZIndex(layout.zIndex),
  };
}

export function snapPinnedMediaLayout(
  layout: PinnedMediaLayout,
  otherLayouts: PinnedMediaLayout[],
  bounds: PinnedMediaBounds,
): PinnedMediaLayout {
  let next = clampPinnedMediaLayout(layout, bounds);
  const width = next.width;
  const totalHeight = cardTotalHeight(next);

  next = {
    ...next,
    x: snapToTargets(next.x, [
      bounds.left + PINNED_MEDIA_FRAME_MARGIN,
      bounds.left + bounds.width - width - PINNED_MEDIA_FRAME_MARGIN,
      ...otherLayouts.flatMap((other) => [
        other.x,
        other.x + other.width,
        other.x + other.width - width,
        other.x - width,
      ]),
    ]),
    y: snapToTargets(next.y, [
      bounds.top + PINNED_MEDIA_FRAME_MARGIN,
      bounds.top + bounds.height - totalHeight - PINNED_MEDIA_FRAME_MARGIN,
      ...otherLayouts.flatMap((other) => {
        const otherTotalHeight = cardTotalHeight(other);
        return [other.y, other.y + otherTotalHeight, other.y + otherTotalHeight - totalHeight, other.y - totalHeight];
      }),
    ]),
  };

  return clampPinnedMediaLayout(next, bounds);
}

export function defaultPinnedMediaLayout({
  aspectRatio,
  bounds,
  existingCards,
  sourceRect = null,
}: {
  aspectRatio?: number | null;
  bounds: PinnedMediaBounds;
  existingCards: StoredPinnedMediaCard[];
  sourceRect?: RectLike | null;
}): PinnedMediaLayout {
  const normalizedAspectRatio = safeAspectRatio(aspectRatio);
  const defaultWidth =
    bounds.width <= 640
      ? clamp(Math.round(bounds.width * 0.58), MIN_CARD_WIDTH, 260)
      : clamp(Math.round(bounds.width * 0.18), 220, 320);
  const baseLayout = clampPinnedMediaLayout(
    {
      aspectRatio: normalizedAspectRatio,
      height: defaultWidth / normalizedAspectRatio,
      width: defaultWidth,
      x: sourceRect
        ? sourceRect.left + sourceRect.width - defaultWidth - PINNED_MEDIA_FRAME_MARGIN * 2
        : bounds.left + bounds.width - defaultWidth - PINNED_MEDIA_FRAME_MARGIN * 2,
      y: sourceRect ? sourceRect.top + PINNED_MEDIA_CARD_CHROME_HEIGHT : bounds.top + PINNED_MEDIA_FRAME_MARGIN * 5,
      zIndex: nextZIndex(existingCards),
    },
    bounds,
  );
  const existingLayouts = existingCards.map((card) => card.layout);

  for (let index = 0; index < 14; index += 1) {
    const candidate = snapPinnedMediaLayout(
      {
        ...baseLayout,
        x: baseLayout.x - index * PINNED_MEDIA_FRAME_MARGIN,
        y: baseLayout.y + index * PINNED_MEDIA_FRAME_MARGIN,
      },
      existingLayouts,
      bounds,
    );

    if (!existingLayouts.some((layout) => layoutsOverlap(candidate, layout))) {
      return candidate;
    }
  }

  return baseLayout;
}

export function upsertPinnedMediaCard(
  cards: StoredPinnedMediaCard[],
  draft: PinDraft,
  bounds: PinnedMediaBounds,
): PinResult {
  const id = pinnedMediaCardId(draft.placeId, draft.kind, draft.itemId);
  const currentCard = cards.find((card) => card.id === id);

  if (currentCard) {
    return {
      cards: bringPinnedMediaCardToFront(cards, id),
      status: "updated",
    };
  }

  if (cards.length >= MAX_PINNED_MEDIA_CARDS) {
    return { cards, status: "limit" };
  }

  return {
    cards: [
      ...cards,
      {
        createdAt: Date.now(),
        id,
        itemId: draft.itemId,
        kind: draft.kind,
        layout: defaultPinnedMediaLayout({
          aspectRatio: draft.aspectRatio,
          bounds,
          existingCards: cards,
          sourceRect: draft.sourceRect,
        }),
        placeId: draft.placeId,
      },
    ],
    status: "added",
  };
}

export function bringPinnedMediaCardToFront(cards: StoredPinnedMediaCard[], id: string): StoredPinnedMediaCard[] {
  const zIndex = nextZIndex(cards);

  return cards.map((card) =>
    card.id === id
      ? {
          ...card,
          layout: {
            ...card.layout,
            zIndex,
          },
        }
      : card,
  );
}

export function updatePinnedMediaLayout(
  cards: StoredPinnedMediaCard[],
  id: string,
  layout: PinnedMediaLayout,
  bounds: PinnedMediaBounds,
): StoredPinnedMediaCard[] {
  return cards.map((card) =>
    card.id === id
      ? {
          ...card,
          layout: clampPinnedMediaLayout(layout, bounds),
        }
      : card,
  );
}

export function resolvePinnedMediaCards(
  cards: StoredPinnedMediaCard[],
  places: PlaceMapItem[],
): ResolvedPinnedMediaCard[] {
  const placesById = new Map(places.map((place) => [place.id, place]));
  const resolvedCards: ResolvedPinnedMediaCard[] = [];

  for (const card of cards) {
    const place = placesById.get(card.placeId);
    const item = place ? findPlaceFanItem(place, { id: card.itemId, kind: card.kind }) : null;

    if (place && item) {
      resolvedCards.push({ ...card, item, place });
    }
  }

  return resolvedCards;
}

export function readPinnedMediaCards(storage: StorageLike | null = getLocalStorage()): StoredPinnedMediaCard[] {
  if (!storage) {
    return [];
  }

  try {
    const parsed = JSON.parse(storage.getItem(PINNED_MEDIA_STORAGE_KEY) ?? "null") as Partial<StoredPayload> | null;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.cards)) {
      return [];
    }

    return parsed.cards.filter(isStoredPinnedMediaCard).slice(0, MAX_PINNED_MEDIA_CARDS);
  } catch {
    return [];
  }
}

export function writePinnedMediaCards(cards: StoredPinnedMediaCard[], storage: StorageLike | null = getLocalStorage()) {
  if (!storage) {
    return;
  }

  try {
    if (cards.length === 0) {
      storage.removeItem(PINNED_MEDIA_STORAGE_KEY);
      return;
    }

    storage.setItem(
      PINNED_MEDIA_STORAGE_KEY,
      JSON.stringify({
        cards: cards.slice(0, MAX_PINNED_MEDIA_CARDS),
        version: 1,
      } satisfies StoredPayload),
    );
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

function isStoredPinnedMediaCard(value: unknown): value is StoredPinnedMediaCard {
  if (!value || typeof value !== "object") {
    return false;
  }

  const card = value as Partial<StoredPinnedMediaCard>;
  return (
    typeof card.id === "string" &&
    typeof card.placeId === "string" &&
    typeof card.itemId === "string" &&
    (card.kind === "photo" || card.kind === "memory") &&
    Number.isFinite(card.createdAt) &&
    isPinnedMediaLayout(card.layout)
  );
}

function isPinnedMediaLayout(value: unknown): value is PinnedMediaLayout {
  if (!value || typeof value !== "object") {
    return false;
  }

  const layout = value as Partial<PinnedMediaLayout>;
  return (
    Number.isFinite(layout.aspectRatio) &&
    Number.isFinite(layout.height) &&
    Number.isFinite(layout.width) &&
    Number.isFinite(layout.x) &&
    Number.isFinite(layout.y) &&
    Number.isFinite(layout.zIndex)
  );
}

function getLocalStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function nextZIndex(cards: StoredPinnedMediaCard[]) {
  return cards.reduce((maxZIndex, card) => Math.max(maxZIndex, normalizeZIndex(card.layout.zIndex)), 0) + 1;
}

function normalizeZIndex(value: number) {
  return Math.max(1, Math.round(Number.isFinite(value) ? value : 1));
}

function snapToTargets(value: number, targets: number[]) {
  let nextValue = value;
  let bestDistance = PINNED_MEDIA_SNAP_THRESHOLD + 1;

  for (const target of targets) {
    if (!Number.isFinite(target)) {
      continue;
    }

    const distance = Math.abs(value - target);
    if (distance <= PINNED_MEDIA_SNAP_THRESHOLD && distance < bestDistance) {
      bestDistance = distance;
      nextValue = target;
    }
  }

  return roundPixel(nextValue);
}

function layoutsOverlap(first: PinnedMediaLayout, second: PinnedMediaLayout) {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + cardTotalHeight(first) <= second.y ||
    second.y + cardTotalHeight(second) <= first.y
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundPixel(value: number) {
  return Math.round(value);
}
