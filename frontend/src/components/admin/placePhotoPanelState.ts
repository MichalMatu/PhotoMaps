import type { AdminPhoto, ContentBlock, PhotoUpdatePayload, PhotoUploadPayload } from "../../api/types";
import { normalizeContentBlocks } from "../content/contentBlocks";

export type PhotoAttributionDraft = {
  attributionAuthor: string;
  attributionSourceUrl: string;
  attributionLicense: string;
  attributionLicenseUrl: string;
};

export const EMPTY_PHOTO_ATTRIBUTION_DRAFT: PhotoAttributionDraft = {
  attributionAuthor: "",
  attributionSourceUrl: "",
  attributionLicense: "",
  attributionLicenseUrl: "",
};

const PHOTO_STATUS_ORDER: Record<AdminPhoto["status"], number> = {
  approved: 0,
  pending: 1,
  rejected: 2,
};

export function sortPlacePhotosForPanel(photos: AdminPhoto[], coverPhotoId: string | null): AdminPhoto[] {
  return [...photos].sort((firstPhoto, secondPhoto) => {
    if (firstPhoto.id === coverPhotoId) {
      return -1;
    }
    if (secondPhoto.id === coverPhotoId) {
      return 1;
    }
    const statusDiff = PHOTO_STATUS_ORDER[firstPhoto.status] - PHOTO_STATUS_ORDER[secondPhoto.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return secondPhoto.created_at.localeCompare(firstPhoto.created_at);
  });
}

function normalizedNullable(value: string): string | null {
  const normalizedValue = value.trim();
  return normalizedValue || null;
}

export function photoAttributionDraftFromPhoto(photo: AdminPhoto): PhotoAttributionDraft {
  return {
    attributionAuthor: photo.attribution_author ?? "",
    attributionSourceUrl: photo.attribution_source_url ?? "",
    attributionLicense: photo.attribution_license ?? "",
    attributionLicenseUrl: photo.attribution_license_url ?? "",
  };
}

export function photoPayloadFromDraft(
  caption: string,
  descriptionBlocks: ContentBlock[],
  attribution: PhotoAttributionDraft,
): PhotoUpdatePayload & PhotoUploadPayload {
  return {
    caption: normalizedNullable(caption),
    description_blocks: normalizeContentBlocks(descriptionBlocks),
    attribution_author: normalizedNullable(attribution.attributionAuthor),
    attribution_source_url: normalizedNullable(attribution.attributionSourceUrl),
    attribution_license: normalizedNullable(attribution.attributionLicense),
    attribution_license_url: normalizedNullable(attribution.attributionLicenseUrl),
  };
}
