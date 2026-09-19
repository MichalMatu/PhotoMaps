import type { ContentBlock } from "./content";
import type { PlaceCustomFields } from "./config";

export type PlaceStatus = "draft" | "published" | "archived";

type PublicPlace = {
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
  cover_photo_id: string | null;
  score: number;
  created_at: string;
  updated_at: string;
};

export type Place = PublicPlace & {
  local_comment: string | null;
  status: PlaceStatus;
};

export type PlaceDetail = PublicPlace & {
  article_blocks: ContentBlock[];
};

export type AdminPlace = Place & {
  article_blocks: ContentBlock[];
};

export type PlacePayload = {
  city_id: string;
  slug: string;
  title: string;
  description: string | null;
  local_comment: string | null;
  article_blocks: ContentBlock[];
  category_ids: string[];
  lat: number;
  lon: number;
  weight: number;
  status: PlaceStatus;
  custom_fields: PlaceCustomFields;
};

export type PlaceUpdatePayload = Partial<PlacePayload> & {
  cover_photo_id?: string | null;
};
