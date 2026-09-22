import type { PlaceMapVisualItem } from "./placePreview";

export type MapAudioTarget = {
  id: string;
  kind: PlaceMapVisualItem["kind"];
  placeId: string;
};

export function isMapAudioTarget(
  target: MapAudioTarget | null,
  placeId: string,
  item: Pick<PlaceMapVisualItem, "id" | "kind">,
) {
  return target?.placeId === placeId && target.id === item.id && target.kind === item.kind;
}

export function isSameMapAudioTarget(left: MapAudioTarget | null, right: MapAudioTarget) {
  return left?.placeId === right.placeId && left.id === right.id && left.kind === right.kind;
}
