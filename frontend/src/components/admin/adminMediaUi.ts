import type { PhotoStatus } from "../../api/client";
import { polishCountLabel } from "../ui/polishCountLabel";

export const ADMIN_MEDIA_STATUS_FILTERS: Array<{ label: string; value: PhotoStatus | "all" }> = [
  { label: "Wszystkie", value: "all" },
  { label: "Do sprawdzenia", value: "pending" },
  { label: "Zatwierdzone", value: "approved" },
  { label: "Odrzucone", value: "rejected" },
];

export const ADMIN_MEDIA_STATUS_LABELS: Record<PhotoStatus, string> = {
  pending: "do sprawdzenia",
  approved: "zatwierdzone",
  rejected: "odrzucone",
};

export const PHOTO_CAPTION_MAX_LENGTH = 120;

export function memoryCountLabel(count: number) {
  return polishCountLabel(count, {
    few: "pamiątki",
    many: "pamiątek",
    one: "pamiątka",
  });
}
