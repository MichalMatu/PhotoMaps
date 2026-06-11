import { request } from "./http";
import type { Report, ReportPayload, ReportStatus } from "./types";

export function createReport(payload: ReportPayload): Promise<Report> {
  return request<Report>("/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAdminReports(status?: ReportStatus): Promise<Report[]> {
  const query = status ? `?status=${status}` : "";
  return request<Report[]>(`/api/admin/reports${query}`);
}

export function updateReport(
  reportId: string,
  payload: { message?: string | null; status?: ReportStatus },
): Promise<Report> {
  return request<Report>(`/api/admin/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
