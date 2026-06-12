import type { Photo } from "../../api/client";

const PHOTO_STATUS_ORDER: Record<Photo["status"], number> = {
  approved: 0,
  pending: 1,
  rejected: 2,
};

export function sortPlacePhotosForPanel(photos: Photo[], coverPhotoId: string | null): Photo[] {
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
