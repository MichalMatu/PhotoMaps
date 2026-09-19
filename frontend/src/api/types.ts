import type { ReviewStatusCounts } from "./types/media";

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

export type {
  PlaceMapItem,
  PlaceMapMemoryPreviewItem,
  PlaceMapPhoto,
  PlaceMapPhotoPreviewItem,
  PlaceMapPreviewItem,
} from "./types/map";

export type {
  Guide,
  GuideDetail,
  GuideKind,
  GuidePayload,
  GuidePlaceOrderPayload,
  GuideRoutePoint,
  GuideStatus,
  GuideUpdatePayload,
  PublicGuide,
  PublicGuideDetail,
  PublicGuidePlacePreview,
} from "./types/guides";

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
