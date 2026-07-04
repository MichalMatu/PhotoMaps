import type { LocalDataCleanupReport, LocalDataDiagnostics } from "./types";
import { request } from "./http";

export function getAdminLocalDataDiagnostics(): Promise<LocalDataDiagnostics> {
  return request<LocalDataDiagnostics>("/api/admin/local-data/diagnostics");
}

export function cleanupAdminOrphanMedia(): Promise<LocalDataCleanupReport> {
  return request<LocalDataCleanupReport>("/api/admin/local-data/orphan-media-cleanup", {
    method: "POST",
  });
}
