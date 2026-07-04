import { useMemo, useState } from "react";

import type { Guide } from "../../api/types";
import type { OperationError } from "../ui/ErrorModal";
import { guideStatusCounts as countGuideStatuses } from "./guideActionsState";
import { useGuideCrud } from "./useGuideCrud";
import { useGuideDetail } from "./useGuideDetail";
import { useGuidePlaceSelection } from "./useGuidePlaceSelection";
import { useGuideReorder } from "./useGuideReorder";

type UseGuideActionsArgs = {
  guides: Guide[];
  onChanged: () => Promise<void>;
};

export function useGuideActions({ guides, onChanged }: UseGuideActionsArgs) {
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const selectedGuide = guides.find((guide) => guide.id === selectedGuideId) ?? null;
  const guideStatusCounts = useMemo(() => countGuideStatuses(guides), [guides]);
  const { guideDetail, isGuideDetailLoading, refreshGuideDetail, setGuideDetail } = useGuideDetail({
    onError: setOperationError,
    selectedGuideId,
  });
  const guidePlaceSelection = useGuidePlaceSelection({
    guideDetail,
    onChanged,
    selectedGuide,
    setGuideDetail,
    setOperationError,
  });
  const guideCrud = useGuideCrud({
    clearGuidePlaceSelection: guidePlaceSelection.clearGuidePlaceSelection,
    onChanged,
    refreshGuideDetail,
    selectedGuideId,
    setGuideDetail,
    setOperationError,
    setSelectedGuideId,
  });
  const guideReorder = useGuideReorder({
    guideDetail,
    onChanged,
    selectedGuide,
    setGuideDetail,
    setOperationError,
  });

  function toggleGuide(guideId: string) {
    setSelectedGuideId((currentGuideId) => (currentGuideId === guideId ? "" : guideId));
    guidePlaceSelection.clearGuidePlaceSelection();
  }

  return {
    ...guideCrud,
    ...guidePlaceSelection,
    ...guideReorder,
    guideDetail,
    guideStatusCounts,
    isGuideDetailLoading,
    operationError,
    selectedGuide,
    selectedGuideId,
    setOperationError,
    toggleGuide,
  };
}
