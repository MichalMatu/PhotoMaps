import { request } from "./http";
import type { Guide, GuideDetail, GuidePayload, GuidePlacePayload } from "./types";

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

export function deleteGuide(guideId: string): Promise<void> {
  return request<void>(`/api/admin/guides/${guideId}`, {
    method: "DELETE",
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
