import { useMemo, useState } from "react";

import type {
  AdminMemory,
  AdminModerationCounts,
  AdminPhoto,
  Report,
  ReportStatus,
  ReportStatusCounts,
  ReviewStatus,
  ReviewStatusCounts,
} from "../../api/types";
import {
  countActiveAdminModerationFilters,
  DEFAULT_ADMIN_MODERATION_FILTERS,
  filterAdminModerationMemories,
  filterAdminModerationPhotos,
  filterAdminModerationReports,
  filterMemoriesByStatus,
  filterPhotosByStatus,
  filterReportsByStatus,
  type AdminModerationFilters,
} from "./adminSectionState";
import type { AdminModerationSection, AdminSection } from "./adminSections";

type Result = {
  activeModerationSection: AdminModerationSection;
  activeSection: AdminSection;
  activeModerationFilterCount: number;
  memoryStatusCounts: ReviewStatusCounts;
  memoryStatusFilter: ReviewStatus | "all";
  moderationFilters: AdminModerationFilters;
  photoStatusCounts: ReviewStatusCounts;
  photoStatusFilter: ReviewStatus | "all";
  reportStatusCounts: ReportStatusCounts;
  reportStatusFilter: ReportStatus | "all";
  setActiveModerationSection: (section: AdminModerationSection) => void;
  setActiveSection: (section: AdminSection) => void;
  setMemoryStatusFilter: (status: ReviewStatus | "all") => void;
  setModerationFilters: (filters: AdminModerationFilters) => void;
  setPhotoStatusFilter: (status: ReviewStatus | "all") => void;
  setReportStatusFilter: (status: ReportStatus | "all") => void;
  visibleMemories: AdminMemory[];
  visiblePhotos: AdminPhoto[];
  visibleReports: Report[];
};

export function useAdminSectionState({
  memories,
  moderationCounts,
  photos,
  reports,
}: {
  memories: AdminMemory[];
  moderationCounts: AdminModerationCounts;
  photos: AdminPhoto[];
  reports: Report[];
}): Result {
  const [activeSection, setActiveSection] = useState<AdminSection>("places");
  const [activeModerationSection, setActiveModerationSection] = useState<AdminModerationSection>("photos");
  const [memoryStatusFilter, setMemoryStatusFilter] = useState<ReviewStatus | "all">("all");
  const [photoStatusFilter, setPhotoStatusFilter] = useState<ReviewStatus | "all">("all");
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatus | "all">("all");
  const [moderationFilters, setModerationFilters] = useState<AdminModerationFilters>(DEFAULT_ADMIN_MODERATION_FILTERS);

  const visiblePhotos = useMemo(
    () => filterAdminModerationPhotos(filterPhotosByStatus(photos, photoStatusFilter), moderationFilters),
    [moderationFilters, photoStatusFilter, photos],
  );
  const visibleMemories = useMemo(
    () => filterAdminModerationMemories(filterMemoriesByStatus(memories, memoryStatusFilter), moderationFilters),
    [memories, memoryStatusFilter, moderationFilters],
  );
  const visibleReports = useMemo(
    () => filterAdminModerationReports(filterReportsByStatus(reports, reportStatusFilter), moderationFilters),
    [moderationFilters, reportStatusFilter, reports],
  );
  return {
    activeModerationSection,
    activeSection,
    activeModerationFilterCount: countActiveAdminModerationFilters(moderationFilters),
    memoryStatusCounts: moderationCounts.memories,
    memoryStatusFilter,
    moderationFilters,
    photoStatusCounts: moderationCounts.photos,
    photoStatusFilter,
    reportStatusCounts: moderationCounts.reports,
    reportStatusFilter,
    setActiveModerationSection,
    setActiveSection,
    setMemoryStatusFilter,
    setModerationFilters,
    setPhotoStatusFilter,
    setReportStatusFilter,
    visibleMemories,
    visiblePhotos,
    visibleReports,
  };
}
