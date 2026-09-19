import type { ContentBlock } from "./types/content";
import type { PlaceCustomFields } from "./types/config";
import type { PlaceStatus } from "./types/places";
import type { AudioAttachment, Photo, PhotoRole, PhotoSource, ReviewStatusCounts } from "./types/media";
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

export type { AdminPlace, Place, PlaceDetail, PlacePayload, PlaceStatus, PlaceUpdatePayload } from "./types/places";

export type {
  AdminMediaAudioFilter,
  AdminMemory,
  AdminPhoto,
  AdminPhotoAlbum,
  AudioAttachment,
  MediaRedactionReport,
  Memory,
  MemoryClaimRead,
  MemorySubmission,
  MemoryUpdatePayload,
  Photo,
  PhotoUpdatePayload,
  PhotoUploadPayload,
  ReviewFinalStatus,
  ReviewStatus,
  ReviewStatusCounts,
} from "./types/media";

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
