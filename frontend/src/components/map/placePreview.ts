import type {
  Photo,
  PlaceMapItem,
  PlaceMapMemoryPreviewItem,
  PlaceMapPhoto,
  PlaceMapPhotoPreviewItem,
  ContentBlock,
} from "../../api/types";

export type PlaceMapVisualItem =
  | {
      audio: Photo["audio"];
      caption: string | null;
      description_blocks: ContentBlock[];
      attribution_author: string | null;
      attribution_source_url: string | null;
      attribution_license: string | null;
      attribution_license_url: string | null;
      id: string;
      kind: "photo";
      public_path: string;
      thumb_path: string;
    }
  | {
      audio: PlaceMapMemoryPreviewItem["audio"];
      caption: string | null;
      id: string;
      kind: "memory";
      public_path: string;
      thumb_path: string;
    };

function photoVisualItem(photo: Photo | PlaceMapPhoto | PlaceMapPhotoPreviewItem): PlaceMapVisualItem {
  return {
    audio: photo.audio,
    caption: photo.caption,
    description_blocks: photo.description_blocks,
    attribution_author: photo.attribution_author,
    attribution_source_url: photo.attribution_source_url,
    attribution_license: photo.attribution_license,
    attribution_license_url: photo.attribution_license_url,
    id: photo.id,
    kind: "photo",
    public_path: photo.public_path,
    thumb_path: photo.thumb_path,
  };
}

function previewMemoryVisualItem(memory: PlaceMapMemoryPreviewItem): PlaceMapVisualItem {
  return {
    audio: memory.audio,
    caption: memory.caption,
    id: memory.id,
    kind: "memory",
    public_path: memory.public_path,
    thumb_path: memory.thumb_path,
  };
}

function previewItemVisualItem(item: PlaceMapPhotoPreviewItem | PlaceMapMemoryPreviewItem): PlaceMapVisualItem {
  return item.kind === "photo" ? photoVisualItem(item) : previewMemoryVisualItem(item);
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

function memoryPreviewItems(place: Pick<PlaceMapItem, "preview_items">): PlaceMapVisualItem[] {
  return place.preview_items
    .filter((item): item is PlaceMapMemoryPreviewItem => item.kind === "memory")
    .map(previewMemoryVisualItem);
}

export function getPlaceGalleryItems(
  place: Pick<PlaceMapItem, "cover_photo" | "preview_items">,
  photos?: Photo[] | null,
): PlaceMapVisualItem[] {
  const fullPhotoItems = photos?.map(photoVisualItem) ?? [];
  const items =
    fullPhotoItems.length > 0 ? fullPhotoItems : place.cover_photo ? [photoVisualItem(place.cover_photo)] : [];
  const seenIds = new Set(items.map((item) => `${item.kind}:${item.id}`));
  const previewSourceItems =
    fullPhotoItems.length > 0 ? memoryPreviewItems(place) : place.preview_items.map(previewItemVisualItem);

  for (const previewItem of previewSourceItems) {
    const itemKey = `${previewItem.kind}:${previewItem.id}`;
    if (!seenIds.has(itemKey)) {
      items.push(previewItem);
      seenIds.add(itemKey);
    }
  }

  return items;
}

export function findPlaceGalleryItem(
  place: Pick<PlaceMapItem, "cover_photo" | "preview_items">,
  target: { id: string; kind: PlaceMapVisualItem["kind"] },
  photos?: Photo[] | null,
): PlaceMapVisualItem | null {
  return getPlaceGalleryItems(place, photos).find((item) => item.kind === target.kind && item.id === target.id) ?? null;
}
