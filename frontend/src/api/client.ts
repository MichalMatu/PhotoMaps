const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type Category = {
  id: string;
  label: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
};

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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getCategories(): Promise<Category[]> {
  return request<Category[]>("/api/categories");
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

export function getAdminPhotos(status: PhotoStatus | "all" = "pending"): Promise<Photo[]> {
  const query = status === "all" ? "" : `?status=${status}`;
  return request<Photo[]>(`/api/admin/photos${query}`);
}

export function reviewPhoto(photoId: string, status: "approved" | "rejected"): Promise<Photo> {
  return request<Photo>(`/api/admin/photos/${photoId}/review`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function mediaUrl(path: string): string {
  if (path.startsWith("http")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}
