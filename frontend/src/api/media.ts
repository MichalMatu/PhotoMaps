import { request } from "./http";
import type {
  AdminMediaAudioFilter,
  AdminMemory,
  AdminPhotoAlbum,
  AdminMemoryUpdatePayload,
  AdminPlace,
  AdminPhoto,
  MediaRedactionPayload,
  MediaRedactionReport,
  MemoryClaimRead,
  MemorySubmission,
  Memory,
  MemoryUpdatePayload,
  Photo,
  PhotoUploadPayload,
  PhotoUpdatePayload,
  ReviewFinalStatus,
  ReviewStatus,
} from "./types";

const ADMIN_REVIEW_QUEUE_LIMIT = 100;

type AdminReviewQueueOptions = {
  limit?: number;
  offset?: number;
  status?: ReviewStatus;
};

type AdminPhotoFilterOptions = {
  audio?: AdminMediaAudioFilter;
  placeId?: string;
  query?: string;
  status?: ReviewStatus;
};

function adminReviewQueueQuery(options: AdminReviewQueueOptions = {}): string {
  const query = new URLSearchParams();
  query.set("limit", String(options.limit ?? ADMIN_REVIEW_QUEUE_LIMIT));
  if (options.offset) {
    query.set("offset", String(options.offset));
  }
  if (options.status) {
    query.set("status", options.status);
  }
  return `?${query.toString()}`;
}

function adminPhotoFilterQuery(options: AdminPhotoFilterOptions = {}): string {
  const query = new URLSearchParams();
  if (options.status) {
    query.set("status", options.status);
  }
  if (options.placeId && options.placeId !== "all") {
    query.set("place_id", options.placeId);
  }
  const normalizedQuery = options.query?.trim() ?? "";
  if (normalizedQuery) {
    query.set("query", normalizedQuery);
  }
  if (options.audio && options.audio !== "all") {
    query.set("audio", options.audio);
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function getPlaceMemories(placeId: string): Promise<Memory[]> {
  return request<Memory[]>(`/api/places/${placeId}/memories`);
}

export function getPlacePhotos(placeId: string): Promise<Photo[]> {
  return request<Photo[]>(`/api/places/${placeId}/photos`);
}

export function getPlaceMemory(placeId: string, memoryId: string): Promise<Memory> {
  return request<Memory>(`/api/places/${placeId}/memories/${memoryId}`);
}

export function uploadAdminPlacePhoto(
  placeId: string,
  file: File,
  payload: PhotoUploadPayload,
  audioFile?: File | null,
): Promise<AdminPhoto> {
  const formData = new FormData();
  formData.append("file", file);
  if (audioFile) {
    formData.append("audio_file", audioFile);
  }
  appendOptionalFormField(formData, "caption", payload.caption);
  appendDescriptionBlocksFormField(formData, payload.description_blocks);
  appendOptionalFormField(formData, "attribution_author", payload.attribution_author);
  appendOptionalFormField(formData, "attribution_source_url", payload.attribution_source_url);
  appendOptionalFormField(formData, "attribution_license", payload.attribution_license);
  appendOptionalFormField(formData, "attribution_license_url", payload.attribution_license_url);

  return request<AdminPhoto>(`/api/admin/places/${placeId}/photos`, {
    method: "POST",
    body: formData,
  });
}

export function getAdminPlacePhotos(placeId: string, options: AdminPhotoFilterOptions = {}): Promise<AdminPhoto[]> {
  return request<AdminPhoto[]>(`/api/admin/places/${placeId}/photos${adminPhotoFilterQuery(options)}`);
}

export function getAdminPhotoAlbums(options: AdminPhotoFilterOptions = {}): Promise<AdminPhotoAlbum[]> {
  return request<AdminPhotoAlbum[]>(`/api/admin/photos/albums${adminPhotoFilterQuery(options)}`);
}

function appendOptionalFormField(formData: FormData, name: string, value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? "";
  if (normalizedValue) {
    formData.append(name, normalizedValue);
  }
}

function appendDescriptionBlocksFormField(
  formData: FormData,
  blocks: PhotoUploadPayload["description_blocks"] | undefined,
) {
  if (blocks && blocks.length > 0) {
    formData.append("description_blocks", JSON.stringify(blocks));
  }
}

export function uploadPlaceMemory(
  placeId: string,
  payload: {
    authorCity: string;
    authorName: string;
    caption: string;
    claimToken: string;
    consentConfirmed: boolean;
    audioFile?: File | null;
    file: File;
    memoryText: string;
  },
): Promise<MemorySubmission> {
  const formData = new FormData();
  formData.append("file", payload.file);
  if (payload.audioFile) {
    formData.append("audio_file", payload.audioFile);
  }
  formData.append("caption", payload.caption.trim());
  formData.append("memory_text", payload.memoryText.trim());
  formData.append("claim_token", payload.claimToken.trim());
  formData.append("consent_confirmed", String(payload.consentConfirmed));
  if (payload.authorName.trim()) {
    formData.append("author_name", payload.authorName.trim());
  }
  if (payload.authorCity.trim()) {
    formData.append("author_city", payload.authorCity.trim());
  }

  return request<MemorySubmission>(`/api/places/${placeId}/memories`, {
    method: "POST",
    body: formData,
  });
}

export function verifyMemoryClaim(placeId: string, memoryId: string, claimToken: string): Promise<MemoryClaimRead> {
  return request<MemoryClaimRead>(`/api/places/${placeId}/memories/${memoryId}/claim`, {
    method: "POST",
    body: JSON.stringify({ claim_token: claimToken }),
  });
}

export function updateMemory(placeId: string, memoryId: string, payload: MemoryUpdatePayload): Promise<Memory> {
  return request<Memory>(`/api/places/${placeId}/memories/${memoryId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteMemory(placeId: string, memoryId: string, claimToken: string): Promise<void> {
  return request<void>(`/api/places/${placeId}/memories/${memoryId}`, {
    method: "DELETE",
    body: JSON.stringify({ claim_token: claimToken }),
  });
}

export function getAdminPhotos(options: AdminReviewQueueOptions = {}): Promise<AdminPhoto[]> {
  return request<AdminPhoto[]>(`/api/admin/photos${adminReviewQueueQuery(options)}`);
}

export function getAdminMemories(options: AdminReviewQueueOptions = {}): Promise<AdminMemory[]> {
  return request<AdminMemory[]>(`/api/admin/memories${adminReviewQueueQuery(options)}`);
}

export function reviewPhoto(photoId: string, status: ReviewFinalStatus): Promise<AdminPhoto> {
  return request<AdminPhoto>(`/api/admin/photos/${photoId}/review`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function reviewMemory(memoryId: string, status: ReviewFinalStatus): Promise<AdminMemory> {
  return request<AdminMemory>(`/api/admin/memories/${memoryId}/review`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function setCoverPhoto(photoId: string): Promise<AdminPlace> {
  return request<AdminPlace>(`/api/admin/photos/${photoId}/cover`, {
    method: "POST",
  });
}

export function updateAdminPhoto(photoId: string, payload: PhotoUpdatePayload): Promise<AdminPhoto> {
  return request<AdminPhoto>(`/api/admin/photos/${photoId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateAdminPhotoAudio(photoId: string, audioFile: File): Promise<AdminPhoto> {
  const formData = new FormData();
  formData.append("audio_file", audioFile);

  return request<AdminPhoto>(`/api/admin/photos/${photoId}/audio`, {
    method: "PUT",
    body: formData,
  });
}

export function deleteAdminPhotoAudio(photoId: string): Promise<AdminPhoto> {
  return request<AdminPhoto>(`/api/admin/photos/${photoId}/audio`, {
    method: "DELETE",
  });
}

export function updateAdminMemory(memoryId: string, payload: AdminMemoryUpdatePayload): Promise<AdminMemory> {
  return request<AdminMemory>(`/api/admin/memories/${memoryId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateAdminMemoryAudio(memoryId: string, audioFile: File): Promise<AdminMemory> {
  const formData = new FormData();
  formData.append("audio_file", audioFile);

  return request<AdminMemory>(`/api/admin/memories/${memoryId}/audio`, {
    method: "PUT",
    body: formData,
  });
}

export function deleteAdminMemoryAudio(memoryId: string): Promise<AdminMemory> {
  return request<AdminMemory>(`/api/admin/memories/${memoryId}/audio`, {
    method: "DELETE",
  });
}

export function redactAdminPhoto(photoId: string, payload: MediaRedactionPayload): Promise<MediaRedactionReport> {
  return request<MediaRedactionReport>(`/api/admin/photos/${photoId}/redaction`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function redactAdminMemory(memoryId: string, payload: MediaRedactionPayload): Promise<MediaRedactionReport> {
  return request<MediaRedactionReport>(`/api/admin/memories/${memoryId}/redaction`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminPhoto(photoId: string): Promise<void> {
  return request<void>(`/api/admin/photos/${photoId}`, {
    method: "DELETE",
  });
}

export function deleteAdminMemory(memoryId: string): Promise<void> {
  return request<void>(`/api/admin/memories/${memoryId}`, {
    method: "DELETE",
  });
}
