let adminSessionToken = "";
const LEGACY_ADMIN_TOKEN_STORAGE_KEY = "photomaps_admin_token";

if (typeof window !== "undefined") {
  try {
    window.sessionStorage.removeItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in hardened or private browser contexts.
  }
}

export function getAdminSessionToken(): string {
  return adminSessionToken;
}

export function setAdminSessionToken(token: string) {
  adminSessionToken = token;
}

export function clearAdminSessionToken() {
  adminSessionToken = "";
}
