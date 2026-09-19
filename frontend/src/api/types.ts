import type { ContentBlock } from "./types/content";
import type { PlaceCustomFields } from "./types/config";
import type { Category, City } from "./types/taxonomy";

export type { ContentBlock, ContentBlockType } from "./types/content";
export type {
  AppConfig,
  AppConfigMap,
  AppConfigMapMarkerDensity,
  AppConfigMapMarkerPriority,
  AppConfigMapMarkerScale,
  PlaceCustomFieldDefinition,
  PlaceCustomFields,
  PlaceCustomFieldType,
  PlaceCustomFieldValue,
} from "./types/config";
export type {
  Category,
  CategoryPayload,
  CategoryStatus,
  CategoryUpdatePayload,
  City,
  CityPayload,
  CityStatus,
  CityUpdatePayload,
} from "./types/taxonomy";

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

export type ReviewStatus = "pending" | "approved" | "rejected";
export type ReviewFinalStatus = "approved" | "rejected";
export type ReviewStatusCounts = Record<ReviewStatus | "all", number>;
export type AdminMediaAudioFilter = "all" | "with-audio" | "without-audio";
type PhotoRole = "gallery";
type PhotoSource = "editorial";

export type AudioAttachment = {
  public_path: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number;
};

export type Photo = {
  id: string;
  place_id: string;
  public_path: string;
  thumb_path: string;
  caption: string | null;
  attribution_author: string | null;
  attribution_source_url: string | null;
  attribution_license: string | null;
  attribution_license_url: string | null;
  audio: AudioAttachment | null;
};

export type PhotoDetail = Photo & {
  description_blocks: ContentBlock[];
};

export type AdminPhoto = {
  id: string;
  place_id: string;
  public_path: string | null;
  thumb_path: string | null;
  admin_public_path: string;
  admin_thumb_path: string;
  caption: string | null;
  description_blocks: ContentBlock[];
  attribution_author: string | null;
  attribution_source_url: string | null;
  attribution_license: string | null;
  attribution_license_url: string | null;
  audio: AudioAttachment | null;
  admin_audio: AudioAttachment | null;
  role: PhotoRole;
  source: PhotoSource;
  status: ReviewStatus;
  consent_confirmed: boolean;
  created_at: string;
  approved_at: string | null;
};

export type AdminPhotoAlbum = {
  place_id: string;
  photo_count: number;
  cover_photo: AdminPhoto;
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
  audio: AudioAttachment | null;
};

export type MemorySubmission = {
  id: string;
  place_id: string;
  author_name: string | null;
  author_city: string | null;
  caption: string;
  memory_text: string;
  status: ReviewStatus;
  created_at: string;
};

export type AdminMemory = {
  id: string;
  place_id: string;
  author_name: string | null;
  author_city: string | null;
  caption: string;
  memory_text: string;
  public_path: string | null;
  thumb_path: string | null;
  admin_public_path: string;
  admin_thumb_path: string;
  audio: AudioAttachment | null;
  admin_audio: AudioAttachment | null;
  status: ReviewStatus;
  paid: boolean;
  share_slug: string;
  consent_confirmed: boolean;
  created_at: string;
  approved_at: string | null;
};

export type MemoryUpdatePayload = {
  claim_token: string;
  author_city?: string | null;
  author_name?: string | null;
  caption: string;
  memory_text: string;
};

export type MemoryClaimRead = {
  can_edit: boolean;
};

export type AdminMemoryUpdatePayload = {
  author_city: string | null;
  author_name: string | null;
  caption: string;
  memory_text: string;
};

type PhotoAttributionPayload = {
  attribution_author?: string | null;
  attribution_source_url?: string | null;
  attribution_license?: string | null;
  attribution_license_url?: string | null;
};

export type PhotoUploadPayload = PhotoAttributionPayload & {
  caption?: string | null;
  description_blocks?: ContentBlock[];
};

export type PhotoUpdatePayload = PhotoAttributionPayload & {
  caption?: string | null;
  description_blocks?: ContentBlock[];
};

type RedactionPointPayload = {
  x: number;
  y: number;
};

type RedactionRectanglePayload = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export type MediaRedactionPayload = {
  polygons: RedactionPointPayload[][];
  rectangles: RedactionRectanglePayload[];
};

export type MediaRedactionReport = {
  actions: Array<{
    action: string;
    applied: boolean;
    label: string;
    path: string;
    shapes: number;
  }>;
  generated_at: string;
  id: string;
  issues: Array<{
    code: string;
    message: string;
    path?: string | null;
    severity: "error" | "info" | "warning";
  }>;
  kind: "photo" | "memory";
  mode: "apply" | "dry-run";
  status: "ok" | "warning" | "error";
  summary: {
    actions: {
      applied: number;
      total: number;
    };
    issues: {
      by_severity: {
        error: number;
        info: number;
        warning: number;
      };
      total: number;
    };
  };
};

export type { LocalDataCleanupReport, LocalDataDiagnostics } from "./types/localData";

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

export type ReportStatus = "open" | "closed";
export type ReportStatusCounts = Record<ReportStatus | "all", number>;
export type ReportReason = "wrong_data" | "bad_photo" | "closed_place" | "other";
export type ReportTargetType = "place" | "photo" | "memory" | "guide";

export type Report = {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  message: string | null;
  status: ReportStatus;
  created_at: string;
};

export type ReportPayload = {
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  message: string | null;
};

export type ReportUpdatePayload = {
  message?: string | null;
  status?: ReportStatus;
};

export type AdminModerationCounts = {
  photos: ReviewStatusCounts;
  memories: ReviewStatusCounts;
  reports: ReportStatusCounts;
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
