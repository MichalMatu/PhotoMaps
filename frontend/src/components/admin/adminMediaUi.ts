import type { ReviewStatus } from "../../api/types";
import { polishCountLabel } from "../ui/polishCountLabel";
import { ADMIN_REVIEW_STATUS_LABELS } from "./adminStatusUi";

export type AdminModerationMediaStatus = Extract<ReviewStatus, "pending" | "rejected">;

export const ADMIN_MEDIA_STATUS_FILTERS = [
  { label: "Do sprawdzenia", value: "pending" },
  { label: "Odrzucone", value: "rejected" },
] satisfies Array<{ label: string; value: AdminModerationMediaStatus }>;

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
