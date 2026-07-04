import { request } from "./http";
import type { Report, ReportPayload, ReportStatus, ReportUpdatePayload } from "./types";

const ADMIN_REPORT_QUEUE_LIMIT = 100;

type AdminReportQueueOptions = {
  limit?: number;
  offset?: number;
  status?: ReportStatus;
};

function adminReportQueueQuery(options: AdminReportQueueOptions = {}): string {
  const query = new URLSearchParams();
  query.set("limit", String(options.limit ?? ADMIN_REPORT_QUEUE_LIMIT));
  if (options.offset) {
    query.set("offset", String(options.offset));
  }
  if (options.status) {
    query.set("status", options.status);
  }
  return `?${query.toString()}`;
}

export function createReport(payload: ReportPayload): Promise<Report> {
  return request<Report>("/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAdminReports(options: AdminReportQueueOptions = {}): Promise<Report[]> {
  return request<Report[]>(`/api/admin/reports${adminReportQueueQuery(options)}`);
}

export function updateReport(reportId: string, payload: ReportUpdatePayload): Promise<Report> {
  return request<Report>(`/api/admin/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminReport(reportId: string): Promise<void> {
  return request<void>(`/api/admin/reports/${reportId}`, {
    method: "DELETE",
  });
}
