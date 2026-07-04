import { request } from "./http";
import type {
  Guide,
  GuideDetail,
  GuidePlaceOrderPayload,
  GuidePayload,
  GuidePlacePayload,
  GuideUpdatePayload,
  PublicGuide,
  PublicGuideDetail,
} from "./types";

export function getGuides(): Promise<PublicGuide[]> {
  return request<PublicGuide[]>("/api/guides");
}

export function getGuide(slug: string): Promise<PublicGuideDetail> {
  return request<PublicGuideDetail>(`/api/guides/${slug}`);
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

export function updateGuide(guideId: string, payload: GuideUpdatePayload): Promise<Guide> {
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

export function reorderGuidePlaces(guideId: string, payload: GuidePlaceOrderPayload): Promise<GuideDetail> {
  return request<GuideDetail>(`/api/admin/guides/${guideId}/places/order`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
