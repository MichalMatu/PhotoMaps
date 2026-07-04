import { request } from "./http";
import type { AppConfig } from "./types";

export function getAppConfig(): Promise<AppConfig> {
  return request<AppConfig>("/api/app-config");
}

export function getAdminAppConfig(): Promise<AppConfig> {
  return request<AppConfig>("/api/admin/app-config");
}

export function updateAdminAppConfig(payload: AppConfig): Promise<AppConfig> {
  return request<AppConfig>("/api/admin/app-config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
