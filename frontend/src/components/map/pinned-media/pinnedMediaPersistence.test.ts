import { describe, expect, it } from "vitest";

import type { Category, PlaceMapItem, PlaceMapPhoto } from "../../../api/types";
import { resolvePinnedMediaCards, upsertPinnedMediaCard } from "./pinnedMediaBoardCards";
import { PINNED_MEDIA_STORAGE_KEY, readPinnedMediaCards, writePinnedMediaCards } from "./pinnedMediaBoardStorage";
import type { PlaceMapVisualItem } from "../placePreview";
import type { StoredPinnedMediaCard } from "./pinnedMediaBoardTypes";

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

function photo(id: string, caption = `Zdjęcie ${id}`): PlaceMapPhoto {
  return {
    approved_at: null,
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption,
    created_at: "2026-06-10T00:00:00",
    id,
    place_id: "place-1",
    public_path: `/media/photos/${id}.jpg`,
    role: "gallery",
    source: "editorial",
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

function visualPhoto(id: string, caption = `Zdjęcie ${id}`): PlaceMapVisualItem {
  const item = photo(id, caption);
  return {
    audio: item.audio,
    attribution_author: item.attribution_author,
    attribution_license: item.attribution_license,
    attribution_license_url: item.attribution_license_url,
    attribution_source_url: item.attribution_source_url,
    caption: item.caption,
    id: item.id,
    kind: "photo",
    public_path: item.public_path,
    thumb_path: item.thumb_path,
  };
}

function place(previewPhoto = photo("photo-1")): PlaceMapItem {
  return {
    categories: [category()],
    category_ids: ["category-1"],
    city: {
      default_zoom: 13,
      id: "city-1",
      lat: 51.1,
      lon: 17.03,
      name: "Wrocław",
      region: "Dolnośląskie",
      sort_order: 1,
      status: "active",
    },
    city_id: "city-1",
    cover_photo: previewPhoto,
    custom_fields: {},
    description: "Opis miejsca",
    id: "place-1",
    lat: 51.1,
    lon: 17.03,
    memory_count: 0,
    photo_count: 8,
    preview_items: [{ ...previewPhoto, kind: "photo" as const }],
    score: 12,
    slug: "miejsce",
    title: "Miejsce",
    weight: 1,
  };
}

function storedCard(itemSnapshot: PlaceMapVisualItem): StoredPinnedMediaCard {
  return {
    createdAt: 1_000,
    id: `place-1:${itemSnapshot.kind}:${itemSnapshot.id}`,
    itemId: itemSnapshot.id,
    itemSnapshot,
    kind: itemSnapshot.kind,
    layout: {
      aspectRatio: 1.6,
      height: 150,
      width: 240,
      x: 24,
      y: 36,
      zIndex: 1,
    },
    placeId: "place-1",
  };
}

describe("pinned media persistence", () => {
  it("restores a pinned full-gallery photo that is absent from map preview data", () => {
    const hiddenPhoto = visualPhoto("photo-8", "Ósme zdjęcie");
    const cards = resolvePinnedMediaCards([storedCard(hiddenPhoto)], [place()]);

    expect(cards).toHaveLength(1);
    expect(cards[0].item).toEqual(hiddenPhoto);
  });

  it("prefers current map preview data over an older stored snapshot", () => {
    const staleSnapshot = visualPhoto("photo-2", "Stary podpis");
    const currentPhoto = photo("photo-2", "Aktualny podpis");
    const currentPlace = place(currentPhoto);
    const cards = resolvePinnedMediaCards([storedCard(staleSnapshot)], [currentPlace]);

    expect(cards[0].item.caption).toBe("Aktualny podpis");
    expect(cards[0].itemSnapshot?.caption).toBe("Aktualny podpis");
  });

  it("persists and validates the media snapshot in version 1 storage", () => {
    const storage = new MemoryStorage();
    const card = storedCard(visualPhoto("photo-8"));

    writePinnedMediaCards([card], storage);

    expect(JSON.parse(storage.getItem(PINNED_MEDIA_STORAGE_KEY) ?? "{}")).toMatchObject({ version: 1 });
    expect(readPinnedMediaCards(storage)).toEqual([card]);
  });

  it("enriches a legacy pinned card when the same media is pinned again", () => {
    const item = visualPhoto("photo-8");
    const legacyCard = { ...storedCard(item), itemSnapshot: undefined };
    const result = upsertPinnedMediaCard(
      [legacyCard],
      {
        itemId: item.id,
        itemSnapshot: item,
        kind: item.kind,
        placeId: "place-1",
      },
      { height: 800, left: 0, top: 0, width: 1200 },
    );

    expect(result.status).toBe("updated");
    expect(result.cards[0].itemSnapshot).toEqual(item);
  });
});
