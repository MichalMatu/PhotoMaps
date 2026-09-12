import { reorderGuidePlaces } from "../../api/guides";
import type { Guide, GuideDetail } from "../../api/types";
import { errorDetails, type OperationError } from "../ui/ErrorModal";
import { guidePlaceOrderPayload, moveGuidePlace, type GuidePlaceMoveDirection } from "./guidePlaceSelection";

type UseGuideReorderArgs = {
  commitGuideDetail: (guideId: string, guideDetail: GuideDetail) => boolean;
  guideDetail: GuideDetail | null;
  isGuideSelected: (guideId: string) => boolean;
  onChanged: () => Promise<void>;
  selectedGuide: Guide | null;
  setOperationError: (error: OperationError | null) => void;
};

export function useGuideReorder({
  commitGuideDetail,
  guideDetail,
  isGuideSelected,
  onChanged,
  selectedGuide,
  setOperationError,
}: UseGuideReorderArgs) {
  async function movePlace(placeId: string, direction: GuidePlaceMoveDirection) {
    if (!selectedGuide || !guideDetail) {
      return;
    }

    const nextPlaces = moveGuidePlace(guideDetail.places, placeId, direction);
    if (nextPlaces === guideDetail.places) {
      return;
    }

    const guideId = selectedGuide.id;
    setOperationError(null);
    try {
      const detail = await reorderGuidePlaces(guideId, guidePlaceOrderPayload(nextPlaces));
      commitGuideDetail(guideId, detail);
      await onChanged();
    } catch (reason) {
      if (isGuideSelected(guideId)) {
        setOperationError({
          details: errorDetails(reason),
          message: "Nie udało się zmienić kolejności miejsc. Spróbuj ponownie.",
          title: "Nie udało się zmienić kolejności",
        });
      }
    }
  }

  return { movePlace };
}
