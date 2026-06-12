import { describe, expect, it } from "vitest";

import type { PlaceMapItem } from "../../api/client";
import {
  countMapLayerPlaces,
  DEFAULT_MAP_LAYER_STATE,
  filterMapPlaces,
  isAllMapLayerPresetActive,
  toggleMapLayer,
} from "./mapLayers";

function place({ id, ...overrides }: Partial<PlaceMapItem> & Pick<PlaceMapItem, "id">): PlaceMapItem {
  return {
    category_ids: [],
    categories: [],
    city: {
      default_zoom: 13,
      id: "wroclaw",
      lat: 51.1079,
      lon: 17.0385,
      name: "Wrocław",
      sort_order: 10,
      status: "active",
    },
    city_id: "wroclaw",
    cover_photo: null,
    cover_photo_id: null,
    created_at: "2026-06-12T00:00:00",
    description: null,
    id,
    lat: 51.1079,
    local_comment: null,
    lon: 17.0385,
    memory_count: 0,
    photo_count: 0,
    preview_items: [],
    score: 0,
    slug: id,
    status: "published",
    title: id,
    updated_at: "2026-06-12T00:00:00",
    weight: 1,
    ...overrides,
  };
}

describe("map layer filtering", () => {
  it("counts all places, featured places, and places with memories independently", () => {
    const places = [
      place({ id: "plain" }),
      place({ id: "featured", weight: 2.5 }),
      place({ id: "photo-count", photo_count: 1 }),
      place({ id: "memory-count", memory_count: 2 }),
      place({
        id: "preview-photo",
        preview_items: [
          {
            approved_at: null,
            caption: null,
            created_at: "2026-06-12T00:00:00",
            id: "photo-1",
            kind: "photo",
            place_id: "preview-photo",
            public_path: "/media/photo.jpg",
            role: "gallery",
            source: "editorial",
            thumb_path: "/media/photo-thumb.jpg",
          },
        ],
      }),
      place({
        id: "preview-memory",
        preview_items: [
          {
            approved_at: null,
            caption: "Byłem tutaj",
            created_at: "2026-06-12T00:00:00",
            id: "memory-1",
            kind: "memory",
            place_id: "preview-memory",
            public_path: "/media/memory.jpg",
            role: null,
            source: null,
            thumb_path: "/media/memory-thumb.jpg",
          },
        ],
      }),
    ];

    expect(countMapLayerPlaces(places)).toEqual({
      all: 9,
      featured: 1,
      memories: 3,
      places: 6,
    });
  });

  it("combines the featured place filter with memory-only content", () => {
    const places = [
      place({
        id: "featured-memory",
        memory_count: 1,
        weight: 2.5,
        preview_items: [
          {
            approved_at: null,
            caption: null,
            created_at: "2026-06-12T00:00:00",
            id: "photo-1",
            kind: "photo",
            place_id: "featured-memory",
            public_path: "/media/photo.jpg",
            role: "gallery",
            source: "editorial",
            thumb_path: "/media/photo-thumb.jpg",
          },
          {
            approved_at: null,
            caption: "Byłem tutaj",
            created_at: "2026-06-12T00:00:00",
            id: "memory-1",
            kind: "memory",
            place_id: "featured-memory",
            public_path: "/media/memory.jpg",
            role: null,
            source: null,
            thumb_path: "/media/memory-thumb.jpg",
          },
        ],
      }),
      place({
        id: "regular-memory",
        memory_count: 1,
        preview_items: [
          {
            approved_at: null,
            caption: "Byłem tutaj",
            created_at: "2026-06-12T00:00:00",
            id: "memory-2",
            kind: "memory",
            place_id: "regular-memory",
            public_path: "/media/memory-2.jpg",
            role: null,
            source: null,
            thumb_path: "/media/memory-2-thumb.jpg",
          },
        ],
      }),
    ];

    const visiblePlaces = filterMapPlaces(places, {
      featuredOnly: true,
      memories: true,
      places: false,
    });

    expect(visiblePlaces.map((item) => item.id)).toEqual(["featured-memory"]);
    expect(visiblePlaces[0].preview_items.map((item) => item.kind)).toEqual(["memory"]);
  });

  it("keeps the main place tile while filtering expanded content to selected layer types", () => {
    const mixedPlace = place({
      id: "mixed",
      cover_photo: {
        approved_at: "2026-06-12T00:00:00",
        caption: "Cover",
        created_at: "2026-06-12T00:00:00",
        id: "cover",
        place_id: "mixed",
        public_path: "/media/cover.jpg",
        role: "map_icon",
        source: "editorial",
        status: "approved",
        thumb_path: "/media/cover-thumb.jpg",
      },
      preview_items: [
        {
          approved_at: null,
          caption: null,
          created_at: "2026-06-12T00:00:00",
          id: "photo-1",
          kind: "photo",
          place_id: "mixed",
          public_path: "/media/photo.jpg",
          role: "gallery",
          source: "editorial",
          thumb_path: "/media/photo-thumb.jpg",
        },
        {
          approved_at: null,
          caption: "Byłem tutaj",
          created_at: "2026-06-12T00:00:00",
          id: "memory-1",
          kind: "memory",
          place_id: "mixed",
          public_path: "/media/memory.jpg",
          role: null,
          source: null,
          thumb_path: "/media/memory-thumb.jpg",
        },
      ],
    });

    const [placesOnlyPlace] = filterMapPlaces([mixedPlace], {
      featuredOnly: false,
      memories: false,
      places: true,
    });
    const [memoryPlace] = filterMapPlaces([mixedPlace], {
      featuredOnly: false,
      memories: true,
      places: false,
    });

    expect(placesOnlyPlace.cover_photo?.id).toBe("cover");
    expect(placesOnlyPlace.preview_items.map((item) => item.kind)).toEqual(["photo"]);
    expect(memoryPlace.cover_photo?.id).toBe("cover");
    expect(memoryPlace.preview_items.map((item) => item.kind)).toEqual(["memory"]);
  });

  it("treats everything as a preset and prevents an empty content selection", () => {
    const placesOnly = toggleMapLayer(DEFAULT_MAP_LAYER_STATE, "places");
    const featuredPlacesOnly = toggleMapLayer(DEFAULT_MAP_LAYER_STATE, "featured");
    const memoriesOnly = toggleMapLayer(DEFAULT_MAP_LAYER_STATE, "memories");

    expect(isAllMapLayerPresetActive(DEFAULT_MAP_LAYER_STATE)).toBe(true);
    expect(placesOnly).toEqual({
      featuredOnly: false,
      memories: false,
      places: true,
    });
    expect(featuredPlacesOnly).toEqual({
      featuredOnly: true,
      memories: false,
      places: true,
    });
    expect(memoriesOnly).toEqual({
      featuredOnly: false,
      memories: true,
      places: false,
    });
    expect(toggleMapLayer(placesOnly, "places")).toBe(placesOnly);
    expect(toggleMapLayer(memoriesOnly, "memories")).toBe(memoriesOnly);
    expect(toggleMapLayer({ featuredOnly: true, memories: true, places: false }, "all")).toEqual(
      DEFAULT_MAP_LAYER_STATE,
    );
  });
});
