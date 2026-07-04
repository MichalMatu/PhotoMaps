import type { RectLike } from "./pinnedMediaBoardTypes";

export type PhotoDetailPinRequest = {
  aspectRatio: number | null;
  sourceRect: RectLike | null;
};

type ImageNaturalSize = {
  naturalHeight: number;
  naturalWidth: number;
};

export function buildPhotoDetailPinRequest(
  sourceRect: RectLike | null,
  imageSize: ImageNaturalSize | null,
): PhotoDetailPinRequest {
  const aspectRatio =
    imageSize && imageSize.naturalWidth > 0 && imageSize.naturalHeight > 0
      ? imageSize.naturalWidth / imageSize.naturalHeight
      : sourceRect && sourceRect.width > 0 && sourceRect.height > 0
        ? sourceRect.width / sourceRect.height
        : null;

  return { aspectRatio, sourceRect };
}

export function photoDetailPinRequestFromTrigger(trigger: HTMLElement): PhotoDetailPinRequest {
  const modalElement = trigger.closest(".system-modal");
  const imageElement = modalElement?.querySelector<HTMLImageElement>(".photo-detail-image") ?? null;
  const modalRect = modalElement?.getBoundingClientRect() ?? null;
  const sourceRect = modalRect
    ? {
        height: modalRect.height,
        left: modalRect.left,
        top: modalRect.top,
        width: modalRect.width,
      }
    : null;
  const imageSize = imageElement
    ? {
        naturalHeight: imageElement.naturalHeight,
        naturalWidth: imageElement.naturalWidth,
      }
    : null;

  return buildPhotoDetailPinRequest(sourceRect, imageSize);
}
