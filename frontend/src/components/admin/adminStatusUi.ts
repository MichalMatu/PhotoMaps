import type { CategoryStatus, CityStatus, GuideStatus, PlaceStatus, ReportStatus, ReviewStatus } from "../../api/types";

const ADMIN_PLACE_STATUS_LABELS: Record<PlaceStatus, string> = {
  archived: "archiwalne",
  draft: "szkic",
  published: "opublikowane",
};

const ADMIN_GUIDE_STATUS_LABELS: Record<GuideStatus, string> = {
  archived: "archiwalne",
  draft: "szkic",
  published: "opublikowana",
};

const ADMIN_CITY_STATUS_LABELS: Record<CityStatus, string> = {
  active: "aktywne",
  archived: "archiwalne",
};

const ADMIN_CATEGORY_STATUS_LABELS: Record<CategoryStatus, string> = {
  active: "aktywna",
  archived: "archiwalna",
};

export const ADMIN_REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  approved: "zatwierdzone",
  pending: "do sprawdzenia",
  rejected: "odrzucone",
};

const ADMIN_REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  closed: "zamknięte",
  open: "otwarte",
};

export const ADMIN_PLACE_STATUS_OPTIONS = [
  { label: "Szkic", value: "draft" },
  { label: "Opublikowane", value: "published" },
  { label: "Archiwalne", value: "archived" },
] satisfies Array<{ label: string; value: PlaceStatus }>;

export const ADMIN_GUIDE_STATUS_OPTIONS = [
  { label: "Szkic", value: "draft" },
  { label: "Opublikowana", value: "published" },
  { label: "Archiwalna", value: "archived" },
] satisfies Array<{ label: string; value: GuideStatus }>;

export const ADMIN_CITY_STATUS_OPTIONS = [
  { label: "Aktywne", value: "active" },
  { label: "Archiwalne", value: "archived" },
] satisfies Array<{ label: string; value: CityStatus }>;

export const ADMIN_CATEGORY_STATUS_OPTIONS = [
  { label: "Aktywna", value: "active" },
  { label: "Archiwalna", value: "archived" },
] satisfies Array<{ label: string; value: CategoryStatus }>;

export const ADMIN_REPORT_STATUS_FILTERS = [
  { label: "Otwarte", value: "open" },
  { label: "Zamknięte", value: "closed" },
] satisfies Array<{ label: string; value: ReportStatus }>;

export function adminPlaceStatusLabel(status: PlaceStatus) {
  return ADMIN_PLACE_STATUS_LABELS[status];
}

export function adminGuideStatusLabel(status: GuideStatus) {
  return ADMIN_GUIDE_STATUS_LABELS[status];
}

export function adminCityStatusLabel(status: CityStatus) {
  return ADMIN_CITY_STATUS_LABELS[status];
}

export function adminCategoryStatusLabel(status: CategoryStatus) {
  return ADMIN_CATEGORY_STATUS_LABELS[status];
}

export function adminReportStatusLabel(status: ReportStatus) {
  return ADMIN_REPORT_STATUS_LABELS[status];
}
