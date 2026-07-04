import {
  MAX_PINNED_MEDIA_CARDS,
  type PinnedMediaLayout,
  type StorageLike,
  type StoredPinnedMediaCard,
} from "./pinnedMediaBoardTypes";

export const PINNED_MEDIA_STORAGE_KEY = "photomap:pinned-media-board:v1";

type StoredPayload = {
  cards: StoredPinnedMediaCard[];
  version: 1;
};

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
