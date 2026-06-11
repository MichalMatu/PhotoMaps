import { request } from "./http";
import type { Category, CategoryPayload, CategoryUpdatePayload } from "./types";

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
