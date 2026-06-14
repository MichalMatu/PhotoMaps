import type { PlaceMapItem } from "../../api/client";
import { findPlaceFanItem, type PlaceMapVisualItem } from "./placePreview";

export const PINNED_MEDIA_STORAGE_KEY = "photomap:pinned-media-board:v3";
const PINNED_MEDIA_VIEWPORT_MARGIN = 12;
const PINNED_MEDIA_SNAP_THRESHOLD = 12;
const PINNED_MEDIA_CARD_CHROME_HEIGHT = 72;

const DEFAULT_ASPECT_RATIO = 16 / 10;
const MIN_CARD_WIDTH = 180;
const MAX_CARD_WIDTH = 360;

type PinnedMediaKind = PlaceMapVisualItem["kind"];

export type ViewportSize = {
  height: number;
  width: number;
};

export type PointLike = {
  x: number;
  y: number;
};

export type RectLike = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type MapAnchor = {
  lat: number;
  lng: number;
};

export type PinnedMediaLayout = {
  aspectRatio: number;
  height: number;
  position: MapAnchor;
  width: number;
  zIndex: number;
};

export type PinnedMediaScreenLayout = {
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

export type ProjectedPinnedMediaCard = ResolvedPinnedMediaCard & {
  layerLayout: PinnedMediaScreenLayout;
  screenLayout: PinnedMediaScreenLayout;
};

type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

type PinDraft = {
  aspectRatio?: number | null;
  itemId: string;
  kind: PinnedMediaKind;
  placeId: string;
  screenToMapPosition: (point: PointLike) => MapAnchor;
  sourceRect?: RectLike | null;
};

type StoredPayload = {
  cards: StoredPinnedMediaCard[];
  version: 3;
};

function pinnedMediaCardId(placeId: string, kind: PinnedMediaKind, itemId: string) {
  return `${placeId}:${kind}:${itemId}`;
}

export function getViewportSize(): ViewportSize {
  if (typeof window === "undefined") {
    return { height: 768, width: 1024 };
  }

  return {
    height: window.innerHeight,
    width: window.innerWidth,
  };
}

export function safeAspectRatio(value: number | null | undefined) {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_ASPECT_RATIO;
  }

  return clamp(value, 0.45, 2.4);
}

export function screenLayoutFromMapPosition(
  layout: PinnedMediaLayout,
  positionPoint: PointLike,
): PinnedMediaScreenLayout {
  return {
    aspectRatio: layout.aspectRatio,
    height: layout.height,
    width: layout.width,
    x: positionPoint.x,
    y: positionPoint.y,
    zIndex: layout.zIndex,
  };
}

export function mapPositionLayoutFromScreen(
  currentLayout: PinnedMediaLayout,
  screenLayout: PinnedMediaScreenLayout,
  screenToMapPosition: (point: PointLike) => MapAnchor,
): PinnedMediaLayout {
  return {
    aspectRatio: safeAspectRatio(screenLayout.aspectRatio),
    height: roundPixel(screenLayout.height),
    position: screenToMapPosition({ x: screenLayout.x, y: screenLayout.y }),
    width: roundPixel(screenLayout.width),
    zIndex: normalizeZIndex(screenLayout.zIndex),
  };
}

export function clampPinnedMediaScreenLayout(
  layout: PinnedMediaScreenLayout,
  viewport: ViewportSize,
): PinnedMediaScreenLayout {
  const aspectRatio = safeAspectRatio(layout.aspectRatio);
  const maxWidth = Math.max(
    MIN_CARD_WIDTH,
    Math.min(MAX_CARD_WIDTH, viewport.width - PINNED_MEDIA_VIEWPORT_MARGIN * 2),
  );
  const minWidth = Math.min(MIN_CARD_WIDTH, maxWidth);
  const maxImageHeight = Math.max(
    96,
    viewport.height - PINNED_MEDIA_VIEWPORT_MARGIN * 2 - PINNED_MEDIA_CARD_CHROME_HEIGHT,
  );
  let width = clamp(layout.width, minWidth, maxWidth);
  let height = width / aspectRatio;

  if (height > maxImageHeight) {
    height = maxImageHeight;
    width = height * aspectRatio;
  }

  const maxX = Math.max(PINNED_MEDIA_VIEWPORT_MARGIN, viewport.width - width - PINNED_MEDIA_VIEWPORT_MARGIN);
  const maxY = Math.max(
    PINNED_MEDIA_VIEWPORT_MARGIN,
    viewport.height - height - PINNED_MEDIA_CARD_CHROME_HEIGHT - PINNED_MEDIA_VIEWPORT_MARGIN,
  );

  return {
    aspectRatio,
    height: roundPixel(height),
    width: roundPixel(width),
    x: roundPixel(clamp(layout.x, PINNED_MEDIA_VIEWPORT_MARGIN, maxX)),
    y: roundPixel(clamp(layout.y, PINNED_MEDIA_VIEWPORT_MARGIN, maxY)),
    zIndex: normalizeZIndex(layout.zIndex),
  };
}

export function snapPinnedMediaScreenLayout(
  layout: PinnedMediaScreenLayout,
  otherLayouts: PinnedMediaScreenLayout[],
  viewport: ViewportSize,
): PinnedMediaScreenLayout {
  let next = clampPinnedMediaScreenLayout(layout, viewport);
  const width = next.width;
  const totalHeight = cardTotalHeight(next);

  next = {
    ...next,
    x: snapToTargets(next.x, [
      PINNED_MEDIA_VIEWPORT_MARGIN,
      viewport.width - width - PINNED_MEDIA_VIEWPORT_MARGIN,
      ...otherLayouts.flatMap((other) => [
        other.x,
        other.x + other.width,
        other.x + other.width - width,
        other.x - width,
      ]),
    ]),
    y: snapToTargets(next.y, [
      PINNED_MEDIA_VIEWPORT_MARGIN,
      viewport.height - totalHeight - PINNED_MEDIA_VIEWPORT_MARGIN,
      ...otherLayouts.flatMap((other) => {
        const otherTotalHeight = cardTotalHeight(other);
        return [other.y, other.y + otherTotalHeight, other.y + otherTotalHeight - totalHeight, other.y - totalHeight];
      }),
    ]),
  };

  return clampPinnedMediaScreenLayout(next, viewport);
}

export function defaultPinnedMediaScreenLayout({
  aspectRatio,
  existingCards,
  sourceRect = null,
  viewport,
}: {
  aspectRatio?: number | null;
  existingCards: ProjectedPinnedMediaCard[];
  sourceRect?: RectLike | null;
  viewport: ViewportSize;
}): PinnedMediaScreenLayout {
  const normalizedAspectRatio = safeAspectRatio(aspectRatio);
  const defaultWidth =
    viewport.width <= 640
      ? clamp(Math.round(viewport.width * 0.58), MIN_CARD_WIDTH, 260)
      : clamp(Math.round(viewport.width * 0.18), 220, 320);
  const baseLayout = clampPinnedMediaScreenLayout(
    {
      aspectRatio: normalizedAspectRatio,
      height: defaultWidth / normalizedAspectRatio,
      width: defaultWidth,
      x: sourceRect
        ? sourceRect.left + sourceRect.width - defaultWidth - PINNED_MEDIA_VIEWPORT_MARGIN * 2
        : viewport.width - defaultWidth - PINNED_MEDIA_VIEWPORT_MARGIN * 2,
      y: sourceRect ? sourceRect.top + PINNED_MEDIA_CARD_CHROME_HEIGHT : PINNED_MEDIA_VIEWPORT_MARGIN * 5,
      zIndex: nextZIndex(existingCards),
    },
    viewport,
  );
  const existingLayouts = existingCards.map((card) => card.screenLayout);

  for (let index = 0; index < 14; index += 1) {
    const candidate = snapPinnedMediaScreenLayout(
      {
        ...baseLayout,
        x: baseLayout.x - index * PINNED_MEDIA_VIEWPORT_MARGIN,
        y: baseLayout.y + index * PINNED_MEDIA_VIEWPORT_MARGIN,
      },
      existingLayouts,
      viewport,
    );

    if (!existingLayouts.some((layout) => layoutsOverlap(candidate, layout))) {
      return candidate;
    }
  }

  return baseLayout;
}

export function upsertPinnedMediaCard(
  cards: StoredPinnedMediaCard[],
  projectedCards: ProjectedPinnedMediaCard[],
  draft: PinDraft,
  viewport: ViewportSize,
): { cards: StoredPinnedMediaCard[]; status: "added" | "updated" } {
  const id = pinnedMediaCardId(draft.placeId, draft.kind, draft.itemId);
  const currentCard = cards.find((card) => card.id === id);

  if (currentCard) {
    return {
      cards: bringPinnedMediaCardToFront(cards, id),
      status: "updated",
    };
  }

  const screenLayout = defaultPinnedMediaScreenLayout({
    aspectRatio: draft.aspectRatio,
    existingCards: projectedCards,
    sourceRect: draft.sourceRect,
    viewport,
  });

  return {
    cards: [
      ...cards,
      {
        createdAt: Date.now(),
        id,
        itemId: draft.itemId,
        kind: draft.kind,
        layout: mapPositionLayoutFromScreen(
          {
            aspectRatio: screenLayout.aspectRatio,
            height: screenLayout.height,
            position: draft.screenToMapPosition({ x: screenLayout.x, y: screenLayout.y }),
            width: screenLayout.width,
            zIndex: screenLayout.zIndex,
          },
          screenLayout,
          draft.screenToMapPosition,
        ),
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
  screenLayout: PinnedMediaScreenLayout,
  screenToMapPosition: (point: PointLike) => MapAnchor,
): StoredPinnedMediaCard[] {
  return cards.map((card) =>
    card.id === id
      ? {
          ...card,
          layout: mapPositionLayoutFromScreen(card.layout, screenLayout, screenToMapPosition),
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
    if (!parsed || parsed.version !== 3 || !Array.isArray(parsed.cards)) {
      return [];
    }

    return parsed.cards.filter(isStoredPinnedMediaCard);
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
        cards,
        version: 3,
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
    isMapAnchor(layout.position) &&
    Number.isFinite(layout.width) &&
    Number.isFinite(layout.zIndex)
  );
}

function isMapAnchor(value: unknown): value is MapAnchor {
  if (!value || typeof value !== "object") {
    return false;
  }

  const anchor = value as Partial<MapAnchor>;
  return Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng);
}

function getLocalStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function nextZIndex(cards: Array<Pick<StoredPinnedMediaCard, "layout"> | Pick<ProjectedPinnedMediaCard, "layout">>) {
  return cards.reduce((maxZIndex, card) => Math.max(maxZIndex, normalizeZIndex(card.layout.zIndex)), 0) + 1;
}

function cardTotalHeight(layout: Pick<PinnedMediaScreenLayout, "height">) {
  return layout.height + PINNED_MEDIA_CARD_CHROME_HEIGHT;
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

function layoutsOverlap(first: PinnedMediaScreenLayout, second: PinnedMediaScreenLayout) {
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
