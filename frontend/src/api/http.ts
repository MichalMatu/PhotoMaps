import { getStoredAdminToken } from "./auth";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function apiErrorMessageFromBody(body: string, fallback: string): string {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmedBody) as { detail?: unknown; message?: unknown };
    const detail = parsed.detail ?? parsed.message;
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const record = item as { loc?: unknown; msg?: unknown };
          const message = typeof record.msg === "string" ? record.msg : null;
          if (!message) {
            return null;
          }
          const location = Array.isArray(record.loc) ? record.loc.join(".") : null;
          return location ? `${location}: ${message}` : message;
        })
        .filter((message): message is string => Boolean(message));
      if (messages.length > 0) {
        return messages.join("\n");
      }
    }
  } catch {
    return trimmedBody;
  }

  return fallback;
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (path.startsWith("/api/admin")) {
    const token = getStoredAdminToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(`Backend API nie odpowiada pod ${API_BASE_URL}. Uruchom ./scripts/dev_backend.sh.`, 0);
  }

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new ApiError("Token admina jest nieprawidłowy.", response.status);
    }
    if (response.status === 503) {
      throw new ApiError("Token admina nie jest skonfigurowany w backendzie.", response.status);
    }
    throw new ApiError(apiErrorMessageFromBody(body, `Request failed: ${response.status}`), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function mediaUrl(path: string): string {
  if (path.startsWith("http")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}
