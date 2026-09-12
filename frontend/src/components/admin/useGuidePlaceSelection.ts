import type { FormEvent } from "react";
import { useCallback, useState } from "react";

import { addPlaceToGuide, removePlaceFromGuide } from "../../api/guides";
import type { Guide, GuideDetail } from "../../api/types";
import { errorDetails, type OperationError } from "../ui/ErrorModal";
import { toggleGuidePlaceSelection } from "./guidePlaceSelection";

type UseGuidePlaceSelectionArgs = {
  commitGuideDetail: (guideId: string, guideDetail: GuideDetail) => boolean;
  guideDetail: GuideDetail | null;
  isGuideSelected: (guideId: string) => boolean;
  onChanged: () => Promise<void>;
  selectedGuide: Guide | null;
  setOperationError: (error: OperationError | null) => void;
};

export function useGuidePlaceSelection({
  commitGuideDetail,
  guideDetail,
  isGuideSelected,
  onChanged,
  selectedGuide,
  setOperationError,
}: UseGuidePlaceSelectionArgs) {
  const [placeQuery, setPlaceQuery] = useState("");
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);
  const [selectedCityId, setSelectedCityIdState] = useState("");

  const clearGuidePlaceSelection = useCallback(() => {
    setPlaceQuery("");
    setSelectedPlaceIds([]);
    setSelectedCityIdState("");
  }, []);

  function toggleSelectedPlace(placeId: string) {
    setSelectedPlaceIds((currentPlaceIds) => toggleGuidePlaceSelection(currentPlaceIds, placeId));
  }

  function setSelectedCityId(cityId: string) {
    setSelectedCityIdState(cityId);
    setPlaceQuery("");
    setSelectedPlaceIds([]);
  }

  async function addPlaces(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGuide || selectedPlaceIds.length === 0) {
      return;
    }
    const guideId = selectedGuide.id;
    setOperationError(null);
    try {
      let detail: GuideDetail | null = null;
      const currentPlaceCount = guideDetail?.places.length ?? 0;
      for (const [index, selectedPlaceId] of selectedPlaceIds.entries()) {
        detail = await addPlaceToGuide(guideId, {
          place_id: selectedPlaceId,
          sort_order: currentPlaceCount + index,
        });
      }
      if (detail && commitGuideDetail(guideId, detail)) {
        clearGuidePlaceSelection();
      }
      await onChanged();
    } catch (reason) {
      if (isGuideSelected(guideId)) {
        setOperationError({
          details: errorDetails(reason),
          message: "Nie udało się dodać miejsc do trasy. Spróbuj ponownie.",
          title: "Nie udało się dodać miejsc",
        });
      }
    }
  }

  async function removePlace(nextPlaceId: string) {
    if (!selectedGuide) {
      return;
    }
    const guideId = selectedGuide.id;
    setOperationError(null);
    try {
      const detail = await removePlaceFromGuide(guideId, nextPlaceId);
      commitGuideDetail(guideId, detail);
      await onChanged();
    } catch (reason) {
      if (isGuideSelected(guideId)) {
        setOperationError({
          details: errorDetails(reason),
          message: "Nie udało się usunąć miejsca z trasy. Spróbuj ponownie.",
          title: "Nie udało się usunąć miejsca",
        });
      }
    }
  }

  return {
    addPlaces,
    clearGuidePlaceSelection,
    placeQuery,
    removePlace,
    selectedPlaceIds,
    selectedCityId,
    setPlaceQuery,
    setSelectedCityId,
    toggleSelectedPlace,
  };
}
