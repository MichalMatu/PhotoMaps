import type { ContentBlock } from "./content";

export type ReviewStatus = "pending" | "approved" | "rejected";
export type ReviewFinalStatus = "approved" | "rejected";
export type ReviewStatusCounts = Record<ReviewStatus | "all", number>;
export type AdminMediaAudioFilter = "all" | "with-audio" | "without-audio";
export type PhotoRole = "gallery";
export type PhotoSource = "editorial";

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
