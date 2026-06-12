import type { Photo, PlaceMapItem, PlaceMapPreviewItem } from "../../api/client";

export type PlaceMapVisualItem =
  | {
      approved_at: string | null;
      caption: string | null;
      created_at: string;
      id: string;
      kind: "photo";
      public_path: string;
      source: Photo;
      thumb_path: string;
    }
  | {
      approved_at: string | null;
      caption: string;
      created_at: string;
      id: string;
      kind: "memory";
      public_path: string;
      source: PlaceMapPreviewItem;
      thumb_path: string;
    };

function photoVisualItem(photo: Photo): PlaceMapVisualItem {
  return {
    approved_at: photo.approved_at,
    caption: photo.caption,
    created_at: photo.created_at,
    id: photo.id,
    kind: "photo",
    public_path: photo.public_path,
    source: photo,
    thumb_path: photo.thumb_path,
  };
}

function previewMemoryVisualItem(memory: PlaceMapPreviewItem): PlaceMapVisualItem {
  return {
    approved_at: memory.approved_at,
    caption: memory.caption ?? "",
    created_at: memory.created_at,
    id: memory.id,
    kind: "memory",
    public_path: memory.public_path,
    source: memory,
    thumb_path: memory.thumb_path,
  };
}

function previewItemVisualItem(item: PlaceMapPreviewItem): PlaceMapVisualItem {
  return item.kind === "photo"
    ? photoVisualItem({
        approved_at: item.approved_at,
        caption: item.caption,
        created_at: item.created_at,
        id: item.id,
        place_id: item.place_id,
        public_path: item.public_path,
        role: item.role ?? "gallery",
        source: item.source ?? "editorial",
        status: item.status,
        thumb_path: item.thumb_path,
      })
    : previewMemoryVisualItem(item);
}

export function getPlacePreviewVisual(
  place: Pick<PlaceMapItem, "cover_photo" | "preview_items">,
): PlaceMapVisualItem | null {
  const previewPhoto = place.cover_photo ?? null;
  if (previewPhoto) {
    return photoVisualItem(previewPhoto);
  }

  const previewItem = place.preview_items[0] ?? null;
  return previewItem ? previewItemVisualItem(previewItem) : null;
}

export function isMapIconVisualItem(item: PlaceMapVisualItem): boolean {
  return item.kind === "photo" && item.source.role === "map_icon";
}

export function getPlaceFanItems(place: Pick<PlaceMapItem, "cover_photo" | "preview_items">): PlaceMapVisualItem[] {
  const previewVisual = getPlacePreviewVisual(place);

  return place.preview_items
    .map(previewItemVisualItem)
    .filter((item) => !previewVisual || item.kind !== previewVisual.kind || item.id !== previewVisual.id);
}

export function findPlaceFanItem(
  place: Pick<PlaceMapItem, "cover_photo" | "preview_items">,
  target: { id: string; kind: PlaceMapVisualItem["kind"] },
): PlaceMapVisualItem | null {
  return getPlaceFanItems(place).find((item) => item.kind === target.kind && item.id === target.id) ?? null;
}
