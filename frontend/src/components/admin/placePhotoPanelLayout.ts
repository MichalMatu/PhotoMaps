const PLACE_PHOTO_GRID_MIN_SLOTS = 2;
const PLACE_PHOTO_GRID_MAX_SLOTS = 5;
const PLACE_PHOTO_CARD_WIDTH_PX = 280;
const PLACE_PHOTO_GRID_GAP_PX = 12;
const PLACE_PHOTO_MODAL_PADDING_INLINE_PX = 48;
const PLACE_PHOTO_MODAL_MAX_WIDTH_PX = 1520;

export function placePhotoGridSlotCount(photoCount: number) {
  const slotCount = photoCount + 1;
  return Math.min(PLACE_PHOTO_GRID_MAX_SLOTS, Math.max(PLACE_PHOTO_GRID_MIN_SLOTS, slotCount));
}

export function placePhotoModalWidthPx(photoCount: number) {
  const slotCount = placePhotoGridSlotCount(photoCount);
  if (slotCount === PLACE_PHOTO_GRID_MAX_SLOTS) {
    return PLACE_PHOTO_MODAL_MAX_WIDTH_PX;
  }

  return (
    slotCount * PLACE_PHOTO_CARD_WIDTH_PX +
    (slotCount - 1) * PLACE_PHOTO_GRID_GAP_PX +
    PLACE_PHOTO_MODAL_PADDING_INLINE_PX
  );
}
