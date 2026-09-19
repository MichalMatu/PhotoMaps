import type { PlaceCustomFields } from "./config";
import type { AudioAttachment, PhotoRole, PhotoSource } from "./media";
import type { Category, City } from "./taxonomy";

export type PlaceMapItem = {
  id: string;
  city_id: string;
  slug: string;
  title: string;
  description: string | null;
  category_ids: string[];
  lat: number;
  lon: number;
  weight: number;
  custom_fields: PlaceCustomFields;
  photo_count: number;
  memory_count: number;
  score: number;
  city: City;
  categories: Category[];
  cover_photo: PlaceMapPhoto | null;
  preview_items: PlaceMapPreviewItem[];
};

export type PlaceMapPhoto = {
  id: string;
  place_id: string;
  public_path: string;
  thumb_path: string;
  role: PhotoRole;
  source: PhotoSource;
  caption: string | null;
  attribution_author: string | null;
  attribution_source_url: string | null;
  attribution_license: string | null;
  attribution_license_url: string | null;
  audio: AudioAttachment | null;
  created_at: string;
  approved_at: string | null;
};

export type PlaceMapPhotoPreviewItem = PlaceMapPhoto & {
  kind: "photo";
};

export type PlaceMapMemoryPreviewItem = {
  id: string;
  kind: "memory";
  place_id: string;
  public_path: string;
  thumb_path: string;
  caption: string | null;
  audio: AudioAttachment | null;
  created_at: string;
  approved_at: string | null;
};

export type PlaceMapPreviewItem = PlaceMapPhotoPreviewItem | PlaceMapMemoryPreviewItem;
