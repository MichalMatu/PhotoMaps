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

type CityStatus = "active" | "archived";

export type City = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  default_zoom: number;
  sort_order: number;
  status: CityStatus;
};

export type PlaceStatus = "draft" | "published" | "archived";

export type Place = {
  id: string;
  city_id: string;
  slug: string;
  title: string;
  description: string | null;
  local_comment: string | null;
  category_ids: string[];
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
type PhotoRole = "gallery" | "map_icon";
type PhotoSource = "user_upload" | "editorial" | "generated";

export type Photo = {
  id: string;
  place_id: string;
  public_path: string;
  thumb_path: string;
  role: PhotoRole;
  source: PhotoSource;
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

export type MemoryUpdatePayload = {
  claim_token: string;
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
  city: City;
  categories: Category[];
  cover_photo: Photo | null;
  preview_items: PlaceMapPreviewItem[];
};

export type PlaceMapPreviewItem = {
  id: string;
  kind: "photo" | "memory";
  place_id: string;
  public_path: string;
  thumb_path: string;
  role: PhotoRole | null;
  source: PhotoSource | null;
  status: PhotoStatus;
  caption: string | null;
  author_name: string | null;
  author_city: string | null;
  memory_text: string | null;
  paid: boolean | null;
  share_slug: string | null;
  consent_confirmed?: boolean | null;
  created_at: string;
  approved_at: string | null;
};

export type GuideStatus = "draft" | "published" | "archived";

export type Guide = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: GuideStatus;
  place_count: number;
  cover_photo: Photo | null;
  preview_places: GuidePlacePreview[];
  created_at: string;
  updated_at: string;
};

export type GuidePlacePreview = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  local_comment: string | null;
  status: PlaceStatus;
  photo_count: number;
  memory_count: number;
  cover_photo: Photo | null;
};

export type GuideDetail = Guide & {
  places: GuidePlacePreview[];
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
  city_id: string;
  slug: string;
  title: string;
  description: string | null;
  local_comment: string | null;
  category_ids: string[];
  lat: number;
  lon: number;
  weight: number;
  status: PlaceStatus;
};
