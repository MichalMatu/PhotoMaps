import type { PhotoStatus } from "../../api/client";

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
  if (count === 1) {
    return "1 pamiątka";
  }
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits < 12 || lastTwoDigits > 14) {
    if (lastDigit >= 2 && lastDigit <= 4) {
      return `${count} pamiątki`;
    }
  }
  return `${count} pamiątek`;
}
