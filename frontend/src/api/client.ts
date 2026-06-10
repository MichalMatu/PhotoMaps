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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
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

export function getAdminPlaces(): Promise<Place[]> {
  return request<Place[]>("/api/admin/places");
}

export function createPlace(payload: PlacePayload): Promise<Place> {
  return request<Place>("/api/admin/places", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
