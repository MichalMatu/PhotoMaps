import type { Place } from "../../api/client";

type PlaceCompletenessCheck = {
  id: string;
  label: string;
  passes: (place: Place) => boolean;
};

const PLACE_COMPLETENESS_CHECKS: PlaceCompletenessCheck[] = [
  {
    id: "cover",
    label: "cover",
    passes: (place) => Boolean(place.cover_photo_id),
  },
  {
    id: "category",
    label: "kategoria",
    passes: (place) => place.category_ids.length > 0,
  },
  {
    id: "text",
    label: "opis",
    passes: (place) => Boolean(place.description?.trim() || place.local_comment?.trim()),
  },
  {
    id: "location",
    label: "pozycja",
    passes: (place) => Number.isFinite(place.lat) && Number.isFinite(place.lon),
  },
  {
    id: "media",
    label: "media",
    passes: (place) => place.photo_count > 0 || place.memory_count > 0,
  },
];

export function getPlaceCompleteness(place: Place) {
  const missingLabels = PLACE_COMPLETENESS_CHECKS.filter((check) => !check.passes(place)).map((check) => check.label);
  const passedCount = PLACE_COMPLETENESS_CHECKS.length - missingLabels.length;

  return {
    isReady: missingLabels.length === 0,
    missingLabels,
    passedCount,
    totalCount: PLACE_COMPLETENESS_CHECKS.length,
  };
}
