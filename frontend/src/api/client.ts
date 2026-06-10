const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const ADMIN_TOKEN_STORAGE_KEY = "photomaps_admin_token";

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
  is_chain: boolean;
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
  created_at: string;
  approved_at: string | null;
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
  is_chain: boolean;
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    if (response.status === 401) {
      throw new Error("Token admina jest nieprawidłowy.");
    }
    if (response.status === 503) {
      throw new Error("Token admina nie jest skonfigurowany w backendzie.");
    }
    throw new Error(message || `Request failed: ${response.status}`);
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

export function getPlacePhotos(placeId: string): Promise<Photo[]> {
  return request<Photo[]>(`/api/places/${placeId}/photos`);
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

export function uploadPlacePhoto(placeId: string, file: File, caption: string): Promise<Photo> {
  const formData = new FormData();
  formData.append("file", file);
  if (caption.trim()) {
    formData.append("caption", caption.trim());
  }

  return request<Photo>(`/api/places/${placeId}/photos`, {
    method: "POST",
    body: formData,
  });
}

export async function getAdminPhotos(status: PhotoStatus | "all" = "pending"): Promise<Photo[]> {
  if (status === "all") {
    const photoGroups = await Promise.all([
      request<Photo[]>("/api/admin/photos?status=pending"),
      request<Photo[]>("/api/admin/photos?status=approved"),
      request<Photo[]>("/api/admin/photos?status=rejected"),
    ]);

    return photoGroups.flat();
  }

  const query = `?status=${status}`;
  return request<Photo[]>(`/api/admin/photos${query}`);
}

export function reviewPhoto(photoId: string, status: "approved" | "rejected"): Promise<Photo> {
  return request<Photo>(`/api/admin/photos/${photoId}/review`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function setCoverPhoto(photoId: string): Promise<Place> {
  return request<Place>(`/api/admin/photos/${photoId}/cover`, {
    method: "POST",
  });
}

export function deleteAdminPhoto(photoId: string): Promise<void> {
  return request<void>(`/api/admin/photos/${photoId}`, {
    method: "DELETE",
  });
}

export function mediaUrl(path: string): string {
  if (path.startsWith("http")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}
