import { reviewPhoto, uploadAdminPlacePhoto, type Photo } from "../../api/client";

type AdminPhotoUploadDependencies = {
  reviewPhoto: (photoId: string, status: "approved") => Promise<Photo>;
  uploadAdminPlacePhoto: (placeId: string, file: File, caption: string) => Promise<Photo>;
};

export async function uploadAndApproveAdminPlacePhoto(
  placeId: string,
  file: File,
  caption: string,
  dependencies: AdminPhotoUploadDependencies = {
    reviewPhoto,
    uploadAdminPlacePhoto,
  },
) {
  const photo = await dependencies.uploadAdminPlacePhoto(placeId, file, caption);
  await dependencies.reviewPhoto(photo.id, "approved");
  return photo;
}
