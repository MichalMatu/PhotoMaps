import { useCallback, useEffect, useState } from "react";

import type { AdminMediaItem, AdminMediaPlaceGroup } from "./adminMediaGroups";

export function useAdminMediaExpansion<TItem extends AdminMediaItem>(groups: Array<AdminMediaPlaceGroup<TItem>>) {
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedPlaceId((currentPlaceId) => {
      if (currentPlaceId && groups.some((group) => group.placeId === currentPlaceId)) {
        return currentPlaceId;
      }
      return null;
    });
  }, [groups]);

  const togglePlace = useCallback((placeId: string) => {
    setExpandedPlaceId((currentPlaceId) => (currentPlaceId === placeId ? null : placeId));
  }, []);

  const collapsePlace = useCallback(() => {
    setExpandedPlaceId(null);
  }, []);

  return { collapsePlace, expandedPlaceId, togglePlace };
}
