type PlaceMarkerMotionSource = {
  cover_photo: { id: string } | null;
  id: string;
  preview_items: Array<{ id: string; kind: string }>;
};

export type PlaceMarkerMotionState = {
  placesMotionSignature: string;
  signaturesByPlaceId: Map<string, string>;
};

export function getPlaceMarkerMotionSignature(place: PlaceMarkerMotionSource) {
  const previewSignature = place.preview_items.map((item) => `${item.kind}:${item.id}`).join(",");
  return `${place.id}:${place.cover_photo?.id ?? "none"}:${previewSignature}`;
}

export function getPlaceMarkerMotionState(places: PlaceMarkerMotionSource[]): PlaceMarkerMotionState {
  const signaturesByPlaceId = new Map<string, string>();
  const orderedSignatures = places.map((place) => {
    const signature = getPlaceMarkerMotionSignature(place);
    signaturesByPlaceId.set(place.id, signature);
    return signature;
  });

  return {
    placesMotionSignature: orderedSignatures.join("|"),
    signaturesByPlaceId,
  };
}

export function isPlaceMarkerEntering(
  previousSignaturesByPlaceId: Map<string, string> | null,
  placeId: string,
  currentSignature: string,
) {
  return previousSignaturesByPlaceId?.get(placeId) !== currentSignature;
}
