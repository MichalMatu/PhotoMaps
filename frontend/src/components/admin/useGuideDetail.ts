import { useCallback, useEffect, useRef, useState } from "react";

import { getAdminGuide } from "../../api/guides";
import type { GuideDetail } from "../../api/types";
import { errorDetails, type OperationError } from "../ui/ErrorModal";
import { createLatestRequestGuard, type LatestRequestGuard } from "./latestRequestGuard";

type UseGuideDetailArgs = {
  onError: (error: OperationError) => void;
  selectedGuideId: string;
};

export function useGuideDetail({ onError, selectedGuideId }: UseGuideDetailArgs) {
  const [guideDetail, setGuideDetail] = useState<GuideDetail | null>(null);
  const [isGuideDetailLoading, setIsGuideDetailLoading] = useState(false);
  const requestGuard = useRef<LatestRequestGuard>(createLatestRequestGuard());
  const selectedGuideIdRef = useRef(selectedGuideId);
  selectedGuideIdRef.current = selectedGuideId;

  const refreshGuideDetail = useCallback(async (guideId: string) => {
    const guard = requestGuard.current;
    const token = guard.begin();
    setIsGuideDetailLoading(true);
    try {
      const detail = await getAdminGuide(guideId);
      if (guard.isCurrent(token) && selectedGuideIdRef.current === guideId) {
        setGuideDetail(detail);
      }
      return detail;
    } finally {
      if (guard.isCurrent(token) && selectedGuideIdRef.current === guideId) {
        setIsGuideDetailLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const guard = requestGuard.current;
    if (!selectedGuideId) {
      guard.invalidate();
      setGuideDetail(null);
      setIsGuideDetailLoading(false);
      return;
    }

    let isActive = true;
    setGuideDetail(null);
    refreshGuideDetail(selectedGuideId).catch((reason: unknown) => {
      if (!isActive) {
        return;
      }
      onError({
        details: errorDetails(reason),
        message: "Nie udało się pobrać szczegółów trasy. Spróbuj ponownie.",
        title: "Nie udało się pobrać trasy",
      });
    });

    return () => {
      isActive = false;
      guard.invalidate();
    };
  }, [onError, refreshGuideDetail, selectedGuideId]);

  return {
    guideDetail,
    isGuideDetailLoading,
    refreshGuideDetail,
    setGuideDetail,
  };
}
