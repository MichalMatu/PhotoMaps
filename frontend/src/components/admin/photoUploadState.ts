export function canSubmitPhotoUpload({
  file,
  isUploading,
  placeId,
}: {
  file: File | null;
  isUploading: boolean;
  placeId: string;
}) {
  return Boolean(file && placeId && !isUploading);
}
