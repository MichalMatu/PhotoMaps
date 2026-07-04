export const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";
export const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN ?? "dev-admin-token";

export const SNAPSHOT_OPTIONS = {
  animations: "disabled" as const,
  maxDiffPixelRatio: 0.02,
};
