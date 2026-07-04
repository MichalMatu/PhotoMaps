import { useCallback, useEffect, useState } from "react";

import { getAdminGuide } from "../../api/guides";
import type { GuideDetail } from "../../api/types";
import { errorDetails, type OperationError } from "../ui/ErrorModal";

type UseGuideDetailArgs = {
  onError: (error: OperationError) => void;
  selectedGuideId: string;
};

export function useGuideDetail({ onError, selectedGuideId }: UseGuideDetailArgs) {
  const [guideDetail, setGuideDetail] = useState<GuideDetail | null>(null);
  const [isGuideDetailLoading, setIsGuideDetailLoading] = useState(false);

  const refreshGuideDetail = useCallback(async (guideId: string) => {
    const detail = await getAdminGuide(guideId);
    setGuideDetail(detail);
    return detail;
  }, []);

  useEffect(() => {
    if (!selectedGuideId) {
      setGuideDetail(null);
      return;
    }

    let isActive = true;
    setGuideDetail(null);
    setIsGuideDetailLoading(true);
    refreshGuideDetail(selectedGuideId)
      .catch((reason: unknown) => {
        if (!isActive) {
          return;
        }
        onError({
          details: errorDetails(reason),
          message: "Nie udało się pobrać szczegółów trasy. Spróbuj ponownie.",
          title: "Nie udało się pobrać trasy",
        });
      })
      .finally(() => {
        if (isActive) {
          setIsGuideDetailLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [onError, refreshGuideDetail, selectedGuideId]);

  return {
    guideDetail,
    isGuideDetailLoading,
    refreshGuideDetail,
    setGuideDetail,
  };
}
