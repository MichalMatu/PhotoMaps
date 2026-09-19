import type { ReviewStatusCounts } from "./media";

export type ReportStatus = "open" | "closed";
export type ReportStatusCounts = Record<ReportStatus | "all", number>;
export type ReportReason = "wrong_data" | "bad_photo" | "closed_place" | "other";
export type ReportTargetType = "place" | "photo" | "memory" | "guide";

export type Report = {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  message: string | null;
  status: ReportStatus;
  created_at: string;
};

export type ReportPayload = {
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  message: string | null;
};

export type ReportUpdatePayload = {
  message?: string | null;
  status?: ReportStatus;
};

export type AdminModerationCounts = {
  photos: ReviewStatusCounts;
  memories: ReviewStatusCounts;
  reports: ReportStatusCounts;
};
