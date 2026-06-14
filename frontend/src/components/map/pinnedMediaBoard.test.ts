import { describe, expect, it } from "vitest";

import type { Category, Photo, PlaceMapItem, PlaceMapPreviewItem } from "../../api/client";
import {
  bringPinnedMediaCardToFront,
  clampPinnedMediaScreenLayout,
  defaultPinnedMediaScreenLayout,
  mapPositionLayoutFromScreen,
  PINNED_MEDIA_STORAGE_KEY,
  readPinnedMediaCards,
  resolvePinnedMediaCards,
  screenLayoutFromMapPosition,
  snapPinnedMediaScreenLayout,
  type ProjectedPinnedMediaCard,
  type StoredPinnedMediaCard,
  upsertPinnedMediaCard,
  writePinnedMediaCards,
} from "./pinnedMediaBoard";

class MemoryStorage implements Pick<Storage, "getItem" | "removeItem" | "setItem"> {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const anchor = { lat: 51.1, lng: 17.03 };
const positionPoint = { x: 520, y: 300 };

function storedCard(index: number, overrides: Partial<StoredPinnedMediaCard> = {}): StoredPinnedMediaCard {
  return {
    createdAt: 1_000 + index,
    id: `place-1:photo:photo-${index}`,
    itemId: `photo-${index}`,
    kind: "photo",
    layout: {
      aspectRatio: 1.6,
      height: 150,
      position: {
        lat: anchor.lat + index * 0.001,
        lng: anchor.lng + index * 0.001,
      },
      width: 240,
      zIndex: index,
    },
    placeId: "place-1",
    ...overrides,
  };
}

function projectedCard(index: number): ProjectedPinnedMediaCard {
  const card = storedCard(index);
  const sourcePhoto = photo("photo-1");

  return {
    ...card,
    item: {
      approved_at: sourcePhoto.approved_at,
      caption: sourcePhoto.caption,
      created_at: sourcePhoto.created_at,
      id: sourcePhoto.id,
      kind: "photo",
      public_path: sourcePhoto.public_path,
      source: sourcePhoto,
      thumb_path: sourcePhoto.thumb_path,
    },
    layerLayout: screenLayoutFromMapPosition(card.layout, positionPoint),
    place: place(),
    screenLayout: screenLayoutFromMapPosition(card.layout, positionPoint),
  };
}

function category(): Category {
  return {
    description: null,
    icon: null,
    id: "category-1",
    label: "Punkt widokowy",
    sort_order: 1,
    status: "active",
  };
}

function photo(id: string): Photo {
  return {
    approved_at: null,
    caption: `Zdjęcie ${id}`,
    created_at: "2026-06-10T00:00:00",
    id,
    place_id: "place-1",
    public_path: `/media/photos/${id}.jpg`,
    role: "gallery",
    source: "editorial",
    status: "approved",
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

function memory(id: string): PlaceMapPreviewItem {
  return {
    approved_at: null,
    caption: `Pamiątka ${id}`,
    created_at: "2026-06-10T00:00:00",
    id,
    kind: "memory",
    place_id: "place-1",
    public_path: `/media/memories/${id}.jpg`,
    role: null,
    source: null,
    thumb_path: `/media/memories/${id}-thumb.jpg`,
  };
}

function place(): PlaceMapItem {
  const cover = photo("photo-1");

  return {
    categories: [category()],
    category_ids: ["category-1"],
    city: {
      default_zoom: 13,
      id: "city-1",
      lat: 51.1,
      lon: 17.03,
      name: "Wrocław",
      sort_order: 1,
      status: "active",
    },
    city_id: "city-1",
    cover_photo: cover,
    cover_photo_id: cover.id,
    created_at: "2026-06-10T00:00:00",
    description: "Opis miejsca",
    id: "place-1",
    lat: anchor.lat,
    local_comment: null,
    lon: anchor.lng,
    memory_count: 1,
    photo_count: 2,
    preview_items: [{ ...photo("photo-2"), kind: "photo" as const }, memory("memory-1")],
    score: 12,
    slug: "miejsce",
    status: "published",
    title: "Miejsce",
    updated_at: "2026-06-10T00:00:00",
    weight: 1,
  };
}

describe("pinned media board helpers", () => {
  it("stores and reads versioned map-anchored localStorage state", () => {
    const storage = new MemoryStorage();
    const cards = [storedCard(1)];

    writePinnedMediaCards(cards, storage);

    expect(JSON.parse(storage.getItem(PINNED_MEDIA_STORAGE_KEY) ?? "{}")).toMatchObject({ version: 3 });
    expect(readPinnedMediaCards(storage)).toEqual(cards);
  });

  it("allows more than eight map-positioned cards", () => {
    const cards = Array.from({ length: 12 }, (_, index) => storedCard(index + 1));
    const projectedCards = cards.map((card, index) => ({
      ...projectedCard(index + 1),
      ...card,
      screenLayout: screenLayoutFromMapPosition(card.layout, positionPoint),
    }));
    const result = upsertPinnedMediaCard(
      cards,
      projectedCards,
      {
        itemId: "photo-13",
        kind: "photo",
        placeId: "place-1",
        screenToMapPosition: () => anchor,
      },
      { height: 800, width: 1200 },
    );

    expect(result.status).toBe("added");
    expect(result.cards).toHaveLength(13);
  });

  it("does not create duplicate cards and brings an existing card to front", () => {
    const cards = [storedCard(1), storedCard(2)];
    const result = upsertPinnedMediaCard(
      cards,
      [projectedCard(1), projectedCard(2)],
      {
        itemId: "photo-1",
        kind: "photo",
        placeId: "place-1",
        screenToMapPosition: () => anchor,
      },
      { height: 800, width: 1200 },
    );

    expect(result.status).toBe("updated");
    expect(result.cards).toHaveLength(2);
    expect(result.cards.find((card) => card.itemId === "photo-1")?.layout.zIndex).toBeGreaterThan(
      cards[1].layout.zIndex,
    );
  });

  it("resolves only cards still present in current map preview data", () => {
    const cards = [
      storedCard(1),
      storedCard(2),
      storedCard(3, {
        id: "place-1:memory:memory-1",
        itemId: "memory-1",
        kind: "memory",
      }),
      storedCard(4, {
        id: "missing-place:photo:photo-1",
        placeId: "missing-place",
      }),
    ];

    expect(resolvePinnedMediaCards(cards, [place()]).map((card) => card.id)).toEqual([
      "place-1:photo:photo-1",
      "place-1:photo:photo-2",
      "place-1:memory:memory-1",
    ]);
  });

  it("keeps dragged screen layouts inside the viewport", () => {
    const layout = clampPinnedMediaScreenLayout(
      {
        aspectRatio: 1.6,
        height: 600,
        width: 900,
        x: -100,
        y: 900,
        zIndex: 1,
      },
      { height: 640, width: 360 },
    );

    expect(layout.width).toBeLessThanOrEqual(336);
    expect(layout.x).toBeGreaterThanOrEqual(12);
    expect(layout.y + layout.height + 72).toBeLessThanOrEqual(628);
  });

  it("snaps screen layouts lightly to viewport edges and other cards", () => {
    const viewport = { height: 900, width: 1200 };
    const other = {
      aspectRatio: 1.6,
      height: 125,
      width: 200,
      x: 400,
      y: 120,
      zIndex: 1,
    };

    expect(
      snapPinnedMediaScreenLayout(
        {
          aspectRatio: 1.6,
          height: 112.5,
          width: 180,
          x: 391,
          y: 16,
          zIndex: 2,
        },
        [other],
        viewport,
      ),
    ).toMatchObject({ x: 400, y: 12 });
  });

  it("creates a compact default card instead of keeping the large modal size", () => {
    const layout = defaultPinnedMediaScreenLayout({
      aspectRatio: 1.5,
      existingCards: [],
      sourceRect: {
        height: 700,
        left: 100,
        top: 80,
        width: 1100,
      },
      viewport: { height: 900, width: 1440 },
    });

    expect(layout.width).toBeLessThanOrEqual(320);
    expect(layout.height).toBeLessThanOrEqual(214);
    expect(layout.x).toBeGreaterThan(100);
  });

  it("projects stored map positions into screen coordinates", () => {
    const card = storedCard(1);

    expect(screenLayoutFromMapPosition(card.layout, positionPoint)).toMatchObject({
      x: positionPoint.x,
      y: positionPoint.y,
    });
  });

  it("stores dragged screen coordinates as a map position", () => {
    const card = storedCard(1);
    const nextLayout = mapPositionLayoutFromScreen(
      card.layout,
      {
        aspectRatio: 1.5,
        height: 120,
        width: 180,
        x: 640,
        y: 380,
        zIndex: 7,
      },
      (point) => ({ lat: point.y / 10, lng: point.x / 10 }),
    );

    expect(nextLayout).toMatchObject({
      height: 120,
      position: { lat: 38, lng: 64 },
      width: 180,
      zIndex: 7,
    });
  });

  it("persists z-order changes", () => {
    const cards = [storedCard(1), storedCard(2), storedCard(3)];
    const updatedCards = bringPinnedMediaCardToFront(cards, cards[0].id);

    expect(updatedCards[0].layout.zIndex).toBeGreaterThan(updatedCards[2].layout.zIndex);
  });
});
