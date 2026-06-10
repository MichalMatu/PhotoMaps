import type { Memory, Photo, PhotoStatus, Report, ReportStatus } from "../../api/types";

export function filterPhotosByStatus(photos: Photo[], status: PhotoStatus | "all") {
  return status === "all" ? photos : photos.filter((photo) => photo.status === status);
}

export function filterMemoriesByStatus(memories: Memory[], status: PhotoStatus | "all") {
  return status === "all" ? memories : memories.filter((memory) => memory.status === status);
}

export function filterReportsByStatus(reports: Report[], status: ReportStatus | "all") {
  return status === "all" ? reports : reports.filter((report) => report.status === status);
}

export function countPhotosByStatus(photos: Photo[]): Record<PhotoStatus | "all", number> {
  return {
    all: photos.length,
    pending: photos.filter((photo) => photo.status === "pending").length,
    approved: photos.filter((photo) => photo.status === "approved").length,
    rejected: photos.filter((photo) => photo.status === "rejected").length,
  };
}

export function countMemoriesByStatus(memories: Memory[]): Record<PhotoStatus | "all", number> {
  return {
    all: memories.length,
    pending: memories.filter((memory) => memory.status === "pending").length,
    approved: memories.filter((memory) => memory.status === "approved").length,
    rejected: memories.filter((memory) => memory.status === "rejected").length,
  };
}

export function countReportsByStatus(reports: Report[]): Record<ReportStatus | "all", number> {
  return {
    all: reports.length,
    open: reports.filter((report) => report.status === "open").length,
    closed: reports.filter((report) => report.status === "closed").length,
  };
}
