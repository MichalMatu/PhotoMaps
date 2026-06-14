import { describe, expect, it } from "vitest";

import type { PlaceMapItem } from "../../api/client";
import {
  countMapLayerPlaces,
  DEFAULT_MAP_LAYER_STATE,
  EMPTY_MAP_LAYER_STATE,
  filterMapPlaces,
  hasAnyMapLayerActive,
  isAllMapLayerPresetActive,
  isMapLayerControlActive,
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

function activeLayerControlIds(state: Parameters<typeof isMapLayerControlActive>[0]) {
  return (["all", "featured", "places", "memories"] as const).filter((layerId) =>
    isMapLayerControlActive(state, layerId),
  );
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
      featured: true,
      memories: true,
      places: false,
    });

    expect(visiblePlaces.map((item) => item.id)).toEqual(["featured-memory"]);
    expect(visiblePlaces[0].preview_items.map((item) => item.kind)).toEqual(["memory"]);
  });

  it("shows featured places as a standalone preset", () => {
    const places = [
      place({ id: "featured-without-memory", weight: 2.5 }),
      place({ id: "regular" }),
      place({
        id: "featured-with-photo",
        weight: 2.5,
        preview_items: [
          {
            approved_at: null,
            caption: null,
            created_at: "2026-06-12T00:00:00",
            id: "photo-1",
            kind: "photo",
            place_id: "featured-with-photo",
            public_path: "/media/photo.jpg",
            role: "gallery",
            source: "editorial",
            thumb_path: "/media/photo-thumb.jpg",
          },
        ],
      }),
    ];

    const visiblePlaces = filterMapPlaces(places, toggleMapLayer(DEFAULT_MAP_LAYER_STATE, "featured"));

    expect(visiblePlaces.map((item) => item.id)).toEqual(["featured-without-memory", "featured-with-photo"]);
    expect(visiblePlaces[1].preview_items.map((item) => item.kind)).toEqual(["photo"]);
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
      featured: false,
      memories: false,
      places: true,
    });
    const [memoryPlace] = filterMapPlaces([mixedPlace], {
      featured: false,
      memories: true,
      places: false,
    });

    expect(placesOnlyPlace.cover_photo?.id).toBe("cover");
    expect(placesOnlyPlace.preview_items.map((item) => item.kind)).toEqual(["photo"]);
    expect(memoryPlace.cover_photo?.id).toBe("cover");
    expect(memoryPlace.preview_items.map((item) => item.kind)).toEqual(["memory"]);
  });

  it("toggles the all preset to a clean map while individual layers remain non-empty", () => {
    const placesOnly = toggleMapLayer(DEFAULT_MAP_LAYER_STATE, "places");
    const featuredPlacesOnly = toggleMapLayer(DEFAULT_MAP_LAYER_STATE, "featured");
    const memoriesOnly = toggleMapLayer(DEFAULT_MAP_LAYER_STATE, "memories");

    expect(isAllMapLayerPresetActive(DEFAULT_MAP_LAYER_STATE)).toBe(true);
    expect(placesOnly).toEqual({
      featured: false,
      memories: false,
      places: true,
    });
    expect(featuredPlacesOnly).toEqual({
      featured: true,
      memories: false,
      places: false,
    });
    expect(memoriesOnly).toEqual({
      featured: false,
      memories: true,
      places: false,
    });
    expect(toggleMapLayer(DEFAULT_MAP_LAYER_STATE, "all")).toEqual(EMPTY_MAP_LAYER_STATE);
    expect(filterMapPlaces([place({ id: "hidden" })], EMPTY_MAP_LAYER_STATE)).toEqual([]);
    expect(toggleMapLayer(EMPTY_MAP_LAYER_STATE, "all")).toEqual(DEFAULT_MAP_LAYER_STATE);
    expect(toggleMapLayer(placesOnly, "places")).toEqual(EMPTY_MAP_LAYER_STATE);
    expect(toggleMapLayer(memoriesOnly, "memories")).toEqual(EMPTY_MAP_LAYER_STATE);
    expect(toggleMapLayer({ featured: true, memories: true, places: false }, "all")).toEqual(DEFAULT_MAP_LAYER_STATE);
  });

  it("identifies the clean base-map state separately from active layer filters", () => {
    expect(hasAnyMapLayerActive(DEFAULT_MAP_LAYER_STATE)).toBe(true);
    expect(hasAnyMapLayerActive({ featured: true, memories: false, places: false })).toBe(true);
    expect(hasAnyMapLayerActive({ featured: false, memories: false, places: true })).toBe(true);
    expect(hasAnyMapLayerActive({ featured: false, memories: true, places: false })).toBe(true);
    expect(hasAnyMapLayerActive(EMPTY_MAP_LAYER_STATE)).toBe(false);
  });

  it("reports mix-and-match active layer controls while collapsing the complete trio to all", () => {
    const placesOnly = toggleMapLayer(DEFAULT_MAP_LAYER_STATE, "places");
    const featuredActive = toggleMapLayer(DEFAULT_MAP_LAYER_STATE, "featured");
    const memoriesOnly = toggleMapLayer(DEFAULT_MAP_LAYER_STATE, "memories");
    const placesMemories = toggleMapLayer(placesOnly, "memories");
    const featuredMemories = toggleMapLayer(featuredActive, "memories");
    const featuredActiveAgain = toggleMapLayer(featuredMemories, "memories");
    const featuredPlaces = toggleMapLayer(featuredActiveAgain, "places");
    const completeSelection = toggleMapLayer(featuredPlaces, "memories");

    expect(activeLayerControlIds(DEFAULT_MAP_LAYER_STATE)).toEqual(["all"]);
    expect(activeLayerControlIds(placesOnly)).toEqual(["places"]);
    expect(activeLayerControlIds(memoriesOnly)).toEqual(["memories"]);
    expect(activeLayerControlIds(featuredActive)).toEqual(["featured"]);
    expect(activeLayerControlIds(placesMemories)).toEqual(["places", "memories"]);
    expect(activeLayerControlIds(featuredMemories)).toEqual(["featured", "memories"]);
    expect(activeLayerControlIds(featuredActiveAgain)).toEqual(["featured"]);
    expect(activeLayerControlIds(featuredPlaces)).toEqual(["featured", "places"]);
    expect(completeSelection).toEqual(DEFAULT_MAP_LAYER_STATE);
    expect(activeLayerControlIds(completeSelection)).toEqual(["all"]);
    expect(activeLayerControlIds(EMPTY_MAP_LAYER_STATE)).toEqual([]);
  });
});
