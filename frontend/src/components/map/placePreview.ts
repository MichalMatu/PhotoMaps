import type { Memory, Photo, PlaceMapItem } from "../../api/client";

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
      source: Memory;
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

function memoryVisualItem(memory: Memory): PlaceMapVisualItem {
  return {
    approved_at: memory.approved_at,
    caption: memory.caption,
    created_at: memory.created_at,
    id: memory.id,
    kind: "memory",
    public_path: memory.public_path,
    source: memory,
    thumb_path: memory.thumb_path,
  };
}

export function getPlacePreviewVisual(
  place: Pick<PlaceMapItem, "cover_photo" | "photos" | "memories">,
): PlaceMapVisualItem | null {
  const previewPhoto = place.cover_photo ?? place.photos[0] ?? null;
  if (previewPhoto) {
    return photoVisualItem(previewPhoto);
  }

  const previewMemory = place.memories[0] ?? null;
  return previewMemory ? memoryVisualItem(previewMemory) : null;
}

export function getPlaceFanItems(place: Pick<PlaceMapItem, "photos" | "memories">): PlaceMapVisualItem[] {
  return [...place.photos.map(photoVisualItem), ...place.memories.map(memoryVisualItem)];
}

export function findPlaceFanItem(
  place: Pick<PlaceMapItem, "photos" | "memories">,
  target: { id: string; kind: PlaceMapVisualItem["kind"] },
): PlaceMapVisualItem | null {
  return getPlaceFanItems(place).find((item) => item.kind === target.kind && item.id === target.id) ?? null;
}
