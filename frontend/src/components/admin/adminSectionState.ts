import type {
  AdminMemory,
  AdminModerationCounts,
  AdminPhoto,
  Report,
  ReportStatus,
  ReviewStatus,
} from "../../api/types";
import {
  DEFAULT_ADMIN_MODERATION_FILTERS,
  countActiveAdminModerationFilters,
  filterAdminModerationMemories,
  filterAdminModerationReports,
  type AdminModerationFilters,
} from "./adminModerationFilters";

export function filterPhotosByStatus(photos: AdminPhoto[], status: ReviewStatus | "all") {
  return status === "all" ? photos : photos.filter((photo) => photo.status === status);
}

export function filterMemoriesByStatus(memories: AdminMemory[], status: ReviewStatus | "all") {
  return status === "all" ? memories : memories.filter((memory) => memory.status === status);
}

export function filterReportsByStatus(reports: Report[], status: ReportStatus | "all") {
  return status === "all" ? reports : reports.filter((report) => report.status === status);
}

export function countModerationSections(counts: AdminModerationCounts) {
  return {
    memories: counts.memories.pending + counts.memories.rejected,
    photos: counts.photos.pending + counts.photos.rejected,
    reports: counts.reports.open + counts.reports.closed,
  };
}

export {
  DEFAULT_ADMIN_MODERATION_FILTERS,
  countActiveAdminModerationFilters,
  filterAdminModerationMemories,
  filterAdminModerationReports,
};
export type { AdminModerationFilters };
