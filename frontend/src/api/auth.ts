const ADMIN_TOKEN_STORAGE_KEY = "photomaps_admin_token";

export function getStoredAdminToken(): string {
  return window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}

export function saveAdminToken(token: string) {
  window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function clearAdminToken() {
  window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}
