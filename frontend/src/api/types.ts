export type CategoryStatus = "active" | "archived";

export type Category = {
  id: string;
  label: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  status: CategoryStatus;
};

export type CategoryPayload = {
  id: string;
  label: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  status: CategoryStatus;
};

export type CategoryUpdatePayload = Omit<CategoryPayload, "id">;

export type PlaceStatus = "draft" | "published" | "archived";

export type Place = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  local_comment: string | null;
  category_id: string | null;
  lat: number;
  lon: number;
  weight: number;
  status: PlaceStatus;
  photo_count: number;
  memory_count: number;
  cover_photo_id: string | null;
  score: number;
  created_at: string;
  updated_at: string;
};

export type PhotoStatus = "pending" | "approved" | "rejected";

export type Photo = {
  id: string;
  place_id: string;
  public_path: string;
  thumb_path: string;
  status: PhotoStatus;
  caption: string | null;
  consent_confirmed?: boolean;
  created_at: string;
  approved_at: string | null;
};

export type Memory = {
  id: string;
  place_id: string;
  author_name: string | null;
  author_city: string | null;
  caption: string;
  memory_text: string;
  public_path: string;
  thumb_path: string;
  status: PhotoStatus;
  paid: boolean;
  share_slug: string;
  consent_confirmed?: boolean;
  created_at: string;
  approved_at: string | null;
};

export type MemoryClaimPayload = {
  claim_token: string;
};

export type MemoryUpdatePayload = MemoryClaimPayload & {
  author_city: string | null;
  author_name: string | null;
  caption: string;
  memory_text: string;
};

export type AdminMemoryUpdatePayload = {
  author_city: string | null;
  author_name: string | null;
  caption: string;
  memory_text: string;
};

export type PlaceMapItem = Place & {
  category: Category | null;
  cover_photo: Photo | null;
  photos: Photo[];
  memories: Memory[];
};

export type GuideStatus = "draft" | "published" | "archived";

export type Guide = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: GuideStatus;
  created_at: string;
  updated_at: string;
};

export type GuideDetail = Guide & {
  places: Place[];
};

export type GuidePayload = {
  slug: string;
  title: string;
  description: string | null;
  status: GuideStatus;
};

export type GuidePlacePayload = {
  place_id: string;
  sort_order: number;
};

export type ReportStatus = "open" | "closed";
export type ReportTargetType = "place" | "photo" | "memory" | "guide";

export type Report = {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  message: string | null;
  status: ReportStatus;
  created_at: string;
};

export type ReportPayload = {
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  message: string | null;
};

export type PlacePayload = {
  slug: string;
  title: string;
  description: string | null;
  local_comment: string | null;
  category_id: string | null;
  lat: number;
  lon: number;
  weight: number;
  status: PlaceStatus;
};
