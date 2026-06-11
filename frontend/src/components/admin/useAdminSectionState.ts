import { useMemo, useState } from "react";

import type { Memory, Photo, PhotoStatus, Report, ReportStatus } from "../../api/types";
import {
  countMemoriesByStatus,
  countPhotosByStatus,
  countReportsByStatus,
  filterMemoriesByStatus,
  filterPhotosByStatus,
  filterReportsByStatus,
} from "./adminSectionState";
import type { AdminSection } from "./adminSections";

type Result = {
  activeSection: AdminSection;
  memoryStatusCounts: Record<PhotoStatus | "all", number>;
  memoryStatusFilter: PhotoStatus | "all";
  photoStatusCounts: Record<PhotoStatus | "all", number>;
  photoStatusFilter: PhotoStatus | "all";
  reportStatusCounts: Record<ReportStatus | "all", number>;
  reportStatusFilter: ReportStatus | "all";
  setActiveSection: (section: AdminSection) => void;
  setMemoryStatusFilter: (status: PhotoStatus | "all") => void;
  setPhotoStatusFilter: (status: PhotoStatus | "all") => void;
  setReportStatusFilter: (status: ReportStatus | "all") => void;
  visibleMemories: Memory[];
  visiblePhotos: Photo[];
  visibleReports: Report[];
};

export function useAdminSectionState({
  memories,
  photos,
  reports,
}: {
  memories: Memory[];
  photos: Photo[];
  reports: Report[];
}): Result {
  const [activeSection, setActiveSection] = useState<AdminSection>("places");
  const [memoryStatusFilter, setMemoryStatusFilter] = useState<PhotoStatus | "all">("all");
  const [photoStatusFilter, setPhotoStatusFilter] = useState<PhotoStatus | "all">("all");
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatus | "all">("all");

  const visiblePhotos = useMemo(() => filterPhotosByStatus(photos, photoStatusFilter), [photoStatusFilter, photos]);
  const visibleMemories = useMemo(
    () => filterMemoriesByStatus(memories, memoryStatusFilter),
    [memories, memoryStatusFilter],
  );
  const visibleReports = useMemo(
    () => filterReportsByStatus(reports, reportStatusFilter),
    [reportStatusFilter, reports],
  );
  const nextPhotoStatusCounts = useMemo(() => countPhotosByStatus(photos), [photos]);
  const nextMemoryStatusCounts = useMemo(() => countMemoriesByStatus(memories), [memories]);
  const nextReportStatusCounts = useMemo(() => countReportsByStatus(reports), [reports]);

  return {
    activeSection,
    memoryStatusCounts: nextMemoryStatusCounts,
    memoryStatusFilter,
    photoStatusCounts: nextPhotoStatusCounts,
    photoStatusFilter,
    reportStatusCounts: nextReportStatusCounts,
    reportStatusFilter,
    setActiveSection,
    setMemoryStatusFilter,
    setPhotoStatusFilter,
    setReportStatusFilter,
    visibleMemories,
    visiblePhotos,
    visibleReports,
  };
}
