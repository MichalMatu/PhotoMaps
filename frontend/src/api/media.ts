import { request } from "./http";
import type { AdminMemoryUpdatePayload, Memory, MemoryUpdatePayload, Photo, PhotoStatus, Place } from "./types";

export function getPlaceMemories(placeId: string): Promise<Memory[]> {
  return request<Memory[]>(`/api/places/${placeId}/memories`);
}

export function getPlaceMemory(placeId: string, memoryId: string): Promise<Memory> {
  return request<Memory>(`/api/places/${placeId}/memories/${memoryId}`);
}

export function uploadAdminPlacePhoto(placeId: string, file: File, caption: string): Promise<Photo> {
  const formData = new FormData();
  formData.append("file", file);
  if (caption.trim()) {
    formData.append("caption", caption.trim());
  }

  return request<Photo>(`/api/admin/places/${placeId}/photos`, {
    method: "POST",
    body: formData,
  });
}

export function uploadPlaceMemory(
  placeId: string,
  payload: {
    authorCity: string;
    authorName: string;
    caption: string;
    claimToken: string;
    consentConfirmed: boolean;
    file: File;
    memoryText: string;
  },
): Promise<Memory> {
  const formData = new FormData();
  formData.append("file", payload.file);
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

  return request<Memory>(`/api/places/${placeId}/memories`, {
    method: "POST",
    body: formData,
  });
}

export function verifyMemoryClaim(
  placeId: string,
  memoryId: string,
  claimToken: string,
): Promise<{ can_edit: boolean }> {
  return request<{ can_edit: boolean }>(`/api/places/${placeId}/memories/${memoryId}/claim`, {
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

export function getAdminPhotos(status?: PhotoStatus): Promise<Photo[]> {
  const query = status ? `?status=${status}` : "";
  return request<Photo[]>(`/api/admin/photos${query}`);
}

export function getAdminMemories(status?: PhotoStatus): Promise<Memory[]> {
  const query = status ? `?status=${status}` : "";
  return request<Memory[]>(`/api/admin/memories${query}`);
}

export function reviewPhoto(photoId: string, status: "approved" | "rejected"): Promise<Photo> {
  return request<Photo>(`/api/admin/photos/${photoId}/review`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function reviewMemory(memoryId: string, status: "approved" | "rejected"): Promise<Memory> {
  return request<Memory>(`/api/admin/memories/${memoryId}/review`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function setCoverPhoto(photoId: string): Promise<Place> {
  return request<Place>(`/api/admin/photos/${photoId}/cover`, {
    method: "POST",
  });
}

export function updateAdminPhoto(photoId: string, payload: { caption: string | null }): Promise<Photo> {
  return request<Photo>(`/api/admin/photos/${photoId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateAdminMemory(memoryId: string, payload: AdminMemoryUpdatePayload): Promise<Memory> {
  return request<Memory>(`/api/admin/memories/${memoryId}`, {
    method: "PATCH",
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
