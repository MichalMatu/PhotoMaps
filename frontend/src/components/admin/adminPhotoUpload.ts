import { reviewPhoto, uploadAdminPlacePhoto } from "../../api/media";
import type { AdminPhoto, PhotoUploadPayload } from "../../api/types";

type AdminPhotoUploadDependencies = {
  reviewPhoto: (photoId: string, status: "approved") => Promise<AdminPhoto>;
  uploadAdminPlacePhoto: (
    placeId: string,
    file: File,
    payload: PhotoUploadPayload,
    audioFile?: File | null,
  ) => Promise<AdminPhoto>;
};

export async function uploadAndApproveAdminPlacePhoto(
  placeId: string,
  file: File,
  payload: PhotoUploadPayload,
  audioFile: File | null = null,
  dependencies: AdminPhotoUploadDependencies = {
    reviewPhoto,
    uploadAdminPlacePhoto,
  },
) {
  const photo = await dependencies.uploadAdminPlacePhoto(placeId, file, payload, audioFile);
  await dependencies.reviewPhoto(photo.id, "approved");
  return photo;
}
