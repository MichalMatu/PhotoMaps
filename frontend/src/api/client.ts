const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const ADMIN_TOKEN_STORAGE_KEY = "photomaps_admin_token";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function apiErrorMessageFromBody(body: string, fallback: string): string {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmedBody) as { detail?: unknown; message?: unknown };
    const detail = parsed.detail ?? parsed.message;
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const record = item as { loc?: unknown; msg?: unknown };
          const message = typeof record.msg === "string" ? record.msg : null;
          if (!message) {
            return null;
          }
          const location = Array.isArray(record.loc) ? record.loc.join(".") : null;
          return location ? `${location}: ${message}` : message;
        })
        .filter((message): message is string => Boolean(message));
      if (messages.length > 0) {
        return messages.join("\n");
      }
    }
  } catch {
    return trimmedBody;
  }

  return fallback;
}

export type Category = {
  id: string;
  label: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  status: CategoryStatus;
};

export type CategoryStatus = "active" | "archived";

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

export function getStoredAdminToken(): string {
  return window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}

export function saveAdminToken(token: string) {
  window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function clearAdminToken() {
  window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (path.startsWith("/api/admin")) {
    const token = getStoredAdminToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(`Backend API nie odpowiada pod ${API_BASE_URL}. Uruchom ./scripts/dev_backend.sh.`, 0);
  }

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new ApiError("Token admina jest nieprawidłowy.", response.status);
    }
    if (response.status === 503) {
      throw new ApiError("Token admina nie jest skonfigurowany w backendzie.", response.status);
    }
    throw new ApiError(apiErrorMessageFromBody(body, `Request failed: ${response.status}`), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getCategories(): Promise<Category[]> {
  return request<Category[]>("/api/categories");
}

export function getAdminCategories(): Promise<Category[]> {
  return request<Category[]>("/api/admin/categories");
}

export function createCategory(payload: CategoryPayload): Promise<Category> {
  return request<Category>("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCategory(categoryId: string, payload: CategoryUpdatePayload): Promise<Category> {
  return request<Category>(`/api/admin/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archiveCategory(categoryId: string): Promise<Category> {
  return request<Category>(`/api/admin/categories/${categoryId}`, {
    method: "DELETE",
  });
}

export function deleteCategoryPermanently(categoryId: string): Promise<void> {
  return request<void>(`/api/admin/categories/${categoryId}?force=true`, {
    method: "DELETE",
  });
}

export function getPlaces(): Promise<Place[]> {
  return request<Place[]>("/api/places");
}

export function getMapPlaces(): Promise<PlaceMapItem[]> {
  return request<PlaceMapItem[]>("/api/places/map");
}

export function getPlacePhotos(placeId: string): Promise<Photo[]> {
  return request<Photo[]>(`/api/places/${placeId}/photos`);
}

export function getPlaceMemories(placeId: string): Promise<Memory[]> {
  return request<Memory[]>(`/api/places/${placeId}/memories`);
}

export function getAdminPlaces(): Promise<Place[]> {
  return request<Place[]>("/api/admin/places");
}

export function createPlace(payload: PlacePayload): Promise<Place> {
  return request<Place>("/api/admin/places", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePlace(placeId: string, payload: PlacePayload): Promise<Place> {
  return request<Place>(`/api/admin/places/${placeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archivePlace(placeId: string): Promise<Place> {
  return request<Place>(`/api/admin/places/${placeId}`, {
    method: "DELETE",
  });
}

export function uploadPlacePhoto(
  placeId: string,
  file: File,
  caption: string,
  consentConfirmed: boolean,
): Promise<Photo> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("consent_confirmed", String(consentConfirmed));
  if (caption.trim()) {
    formData.append("caption", caption.trim());
  }

  return request<Photo>(`/api/places/${placeId}/photos`, {
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

export function verifyMemoryClaim(placeId: string, memoryId: string, claimToken: string): Promise<{ can_edit: boolean }> {
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

export function getGuides(): Promise<Guide[]> {
  return request<Guide[]>("/api/guides");
}

export function getGuide(slug: string): Promise<GuideDetail> {
  return request<GuideDetail>(`/api/guides/${slug}`);
}

export function getAdminGuides(): Promise<Guide[]> {
  return request<Guide[]>("/api/admin/guides");
}

export function getAdminGuide(guideId: string): Promise<GuideDetail> {
  return request<GuideDetail>(`/api/admin/guides/${guideId}`);
}

export function createGuide(payload: GuidePayload): Promise<Guide> {
  return request<Guide>("/api/admin/guides", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateGuide(guideId: string, payload: GuidePayload): Promise<Guide> {
  return request<Guide>(`/api/admin/guides/${guideId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function addPlaceToGuide(guideId: string, payload: GuidePlacePayload): Promise<GuideDetail> {
  return request<GuideDetail>(`/api/admin/guides/${guideId}/places`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function removePlaceFromGuide(guideId: string, placeId: string): Promise<GuideDetail> {
  return request<GuideDetail>(`/api/admin/guides/${guideId}/places/${placeId}`, {
    method: "DELETE",
  });
}

export function createReport(payload: ReportPayload): Promise<Report> {
  return request<Report>("/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAdminReports(status?: ReportStatus): Promise<Report[]> {
  const query = status ? `?status=${status}` : "";
  return request<Report[]>(`/api/admin/reports${query}`);
}

export function updateReport(reportId: string, payload: { message?: string | null; status?: ReportStatus }): Promise<Report> {
  return request<Report>(`/api/admin/reports/${reportId}`, {
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

export function mediaUrl(path: string): string {
  if (path.startsWith("http")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}
