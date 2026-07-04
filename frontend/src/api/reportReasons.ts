import type { ReportReason } from "./types";

export const DEFAULT_REPORT_REASON: ReportReason = "wrong_data";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  wrong_data: "Nieaktualne dane",
  bad_photo: "Problem ze zdjęciem",
  closed_place: "Miejsce już nie działa",
  other: "Inny powód",
};

export const REPORT_REASON_OPTIONS = Object.entries(REPORT_REASON_LABELS).map(([value, label]) => ({
  label,
  value: value as ReportReason,
}));
