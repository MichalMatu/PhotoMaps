import { useQuery } from "@tanstack/react-query";

import { getPlaceMemory } from "../../api/media";
import type { PlaceMapItem } from "../../api/types";
import type { PlaceMapVisualItem } from "./placePreview";
import { useMemoryOwnerTools } from "./useMemoryOwnerTools";

type Params = {
  item: PlaceMapVisualItem;
  onDeleted: () => void;
  place: PlaceMapItem;
};

export function usePhotoDetailMemory({ item, onDeleted, place }: Params) {
  const { data: memorySource = null } = useQuery({
    enabled: item.kind === "memory",
    queryFn: () => getPlaceMemory(place.id, item.id),
    queryKey: ["place-memory", place.id, item.id],
  });
  const memoryOwnerTools = useMemoryOwnerTools({
    itemKey: `${item.kind}:${item.id}`,
    memory: memorySource,
    onDeleted,
    placeId: place.id,
  });

  return { memoryOwnerTools, memorySource };
}
