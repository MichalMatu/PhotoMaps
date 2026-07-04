import { reorderGuidePlaces } from "../../api/guides";
import type { Guide, GuideDetail } from "../../api/types";
import { errorDetails, type OperationError } from "../ui/ErrorModal";
import { guidePlaceOrderPayload, moveGuidePlace, type GuidePlaceMoveDirection } from "./guidePlaceSelection";

type UseGuideReorderArgs = {
  guideDetail: GuideDetail | null;
  onChanged: () => Promise<void>;
  selectedGuide: Guide | null;
  setGuideDetail: (guideDetail: GuideDetail | null) => void;
  setOperationError: (error: OperationError | null) => void;
};

export function useGuideReorder({
  guideDetail,
  onChanged,
  selectedGuide,
  setGuideDetail,
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

    setOperationError(null);
    try {
      const detail = await reorderGuidePlaces(selectedGuide.id, guidePlaceOrderPayload(nextPlaces));
      setGuideDetail(detail);
      await onChanged();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zmienić kolejności miejsc. Spróbuj ponownie.",
        title: "Nie udało się zmienić kolejności",
      });
    }
  }

  return { movePlace };
}
