import { request } from "./http";
import type { AdminModerationCounts } from "./types";

export function getAdminModerationCounts(): Promise<AdminModerationCounts> {
  return request<AdminModerationCounts>("/api/admin/moderation/counts");
}
