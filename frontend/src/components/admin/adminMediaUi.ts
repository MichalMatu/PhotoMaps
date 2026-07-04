import type { ReviewStatus } from "../../api/types";
import { polishCountLabel } from "../ui/polishCountLabel";
import { ADMIN_REVIEW_STATUS_LABELS } from "./adminStatusUi";

export const ADMIN_MEDIA_STATUS_FILTERS: Array<{ label: string; value: ReviewStatus | "all" }> = [
  { label: "Wszystkie", value: "all" },
  { label: "Do sprawdzenia", value: "pending" },
  { label: "Zatwierdzone", value: "approved" },
  { label: "Odrzucone", value: "rejected" },
];

export const ADMIN_MEDIA_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: ADMIN_REVIEW_STATUS_LABELS.pending,
  approved: ADMIN_REVIEW_STATUS_LABELS.approved,
  rejected: ADMIN_REVIEW_STATUS_LABELS.rejected,
};

export const PHOTO_CAPTION_MAX_LENGTH = 120;
export const PHOTO_ATTRIBUTION_AUTHOR_MAX_LENGTH = 120;
export const PHOTO_ATTRIBUTION_LICENSE_MAX_LENGTH = 120;
export const PHOTO_ATTRIBUTION_URL_MAX_LENGTH = 500;

export function memoryCountLabel(count: number) {
  return polishCountLabel(count, {
    few: "pamiątki",
    many: "pamiątek",
    one: "pamiątka",
  });
}
