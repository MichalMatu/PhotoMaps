import type { ContentBlock } from "./content";
import type { Photo } from "./media";
import type { PlaceStatus } from "./places";

export type GuideStatus = "draft" | "published" | "archived";
export type GuideKind = "route" | "collection";

export type PublicGuide = {
  id: string;
  slug: string;
  kind: GuideKind;
  title: string;
  description: string | null;
  article_blocks: ContentBlock[];
  place_count: number;
  cover_photo: Photo | null;
  preview_places: PublicGuidePlacePreview[];
  route_points: GuideRoutePoint[];
};

export type PublicGuidePlacePreview = {
  id: string;
  city_id: string;
  slug: string;
  title: string;
  description: string | null;
  lat: number;
  lon: number;
  photo_count: number;
  memory_count: number;
  cover_photo: Photo | null;
};

export type GuideRoutePoint = {
  lat: number;
  lon: number;
};

export type PublicGuideDetail = PublicGuide & {
  places: PublicGuidePlacePreview[];
};

export type Guide = PublicGuide & {
  status: GuideStatus;
  preview_places: GuidePlacePreview[];
  created_at: string;
  updated_at: string;
};

type GuidePlacePreview = PublicGuidePlacePreview & {
  local_comment: string | null;
  status: PlaceStatus;
};

export type GuideDetail = Guide & {
  places: GuidePlacePreview[];
};

export type GuidePayload = {
  slug: string;
  kind: GuideKind;
  title: string;
  description: string | null;
  article_blocks: ContentBlock[];
  route_points?: GuideRoutePoint[];
  status: GuideStatus;
};

export type GuideUpdatePayload = Partial<GuidePayload>;

export type GuidePlacePayload = {
  place_id: string;
  sort_order: number;
};

export type GuidePlaceOrderPayload = {
  places: GuidePlacePayload[];
};
