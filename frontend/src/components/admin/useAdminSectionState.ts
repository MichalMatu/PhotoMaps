import { useMemo, useState } from "react";

import type {
  AdminMemory,
  AdminModerationCounts,
  Report,
  ReportStatus,
  ReportStatusCounts,
  ReviewStatusCounts,
} from "../../api/types";
import {
  countActiveAdminModerationFilters,
  DEFAULT_ADMIN_MODERATION_FILTERS,
  filterAdminModerationMemories,
  filterAdminModerationReports,
  filterMemoriesByStatus,
  filterReportsByStatus,
  type AdminModerationFilters,
} from "./adminSectionState";
import type { AdminModerationMediaStatus } from "./adminMediaUi";
import type { AdminModerationSection, AdminSection } from "./adminSections";

type Result = {
  activeModerationSection: AdminModerationSection;
  activeSection: AdminSection;
  activeModerationFilterCount: number;
  memoryStatusCounts: ReviewStatusCounts;
  memoryStatusFilter: AdminModerationMediaStatus;
  moderationFilters: AdminModerationFilters;
  photoStatusCounts: ReviewStatusCounts;
  photoStatusFilter: AdminModerationMediaStatus;
  reportStatusCounts: ReportStatusCounts;
  reportStatusFilter: ReportStatus;
  setActiveModerationSection: (section: AdminModerationSection) => void;
  setActiveSection: (section: AdminSection) => void;
  setMemoryStatusFilter: (status: AdminModerationMediaStatus) => void;
  setModerationFilters: (filters: AdminModerationFilters) => void;
  setPhotoStatusFilter: (status: AdminModerationMediaStatus) => void;
  setReportStatusFilter: (status: ReportStatus) => void;
  visibleMemories: AdminMemory[];
  visibleReports: Report[];
};

export function useAdminSectionState({
  memories,
  moderationCounts,
  reports,
}: {
  memories: AdminMemory[];
  moderationCounts: AdminModerationCounts;
  reports: Report[];
}): Result {
  const [activeSection, setActiveSection] = useState<AdminSection>("places");
  const [activeModerationSection, setActiveModerationSection] = useState<AdminModerationSection>("photos");
  const [memoryStatusFilter, setMemoryStatusFilter] = useState<AdminModerationMediaStatus>("pending");
  const [photoStatusFilter, setPhotoStatusFilter] = useState<AdminModerationMediaStatus>("pending");
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatus>("open");
  const [moderationFilters, setModerationFilters] = useState<AdminModerationFilters>(DEFAULT_ADMIN_MODERATION_FILTERS);

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
    visibleReports,
  };
}
