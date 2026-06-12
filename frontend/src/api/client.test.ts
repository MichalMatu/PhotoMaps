import { afterEach, describe, expect, it, vi } from "vitest";

import { apiErrorMessageFromBody, mediaUrl, uploadAdminPlacePhoto, uploadPlaceMemory } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mediaUrl", () => {
  it("keeps absolute URLs unchanged", () => {
    expect(mediaUrl("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
  });

  it("prefixes API base URL for local media paths", () => {
    expect(mediaUrl("/media/photos/test.jpg")).toBe("http://127.0.0.1:8000/media/photos/test.jpg");
  });
});

describe("apiErrorMessageFromBody", () => {
  it("formats FastAPI validation errors without leaking raw JSON", () => {
    expect(
      apiErrorMessageFromBody(
        JSON.stringify({
          detail: [
            {
              loc: ["body", "memory_text"],
              msg: "Field required",
            },
          ],
        }),
        "Request failed",
      ),
    ).toBe("body.memory_text: Field required");
  });

  it("uses string details directly", () => {
    expect(apiErrorMessageFromBody(JSON.stringify({ detail: "Invalid memory token" }), "Request failed")).toBe(
      "Invalid memory token",
    );
  });
});

describe("uploadPlaceMemory", () => {
  it("sends only the add-memory form contract", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          approved_at: null,
          author_city: "Wrocław",
          author_name: "Marta",
          caption: "Kwiatuszek",
          created_at: "2026-06-10T00:00:00",
          id: "memory-1",
          memory_text: "Było spokojnie",
          paid: false,
          place_id: "place-1",
          public_path: "/media/memories/memory-1.jpg",
          share_slug: "memory-share",
          status: "pending",
          thumb_path: "/media/memories/memory-1-thumb.jpg",
        }),
        { headers: { "Content-Type": "application/json" }, status: 201 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await uploadPlaceMemory("place-1", {
      authorCity: " Wrocław ",
      authorName: " Marta ",
      caption: " Kwiatuszek ",
      claimToken: " token-123 ",
      consentConfirmed: true,
      file: new File(["image"], "memory.jpg", { type: "image/jpeg" }),
      memoryText: " Było spokojnie ",
    });

    const calls = fetchMock.mock.calls as Array<Parameters<typeof fetch>>;
    const [, options] = calls[0];
    const body = options?.body as FormData;

    expect(options?.method).toBe("POST");
    expect(body.get("caption")).toBe("Kwiatuszek");
    expect(body.get("memory_text")).toBe("Było spokojnie");
    expect(body.get("claim_token")).toBe("token-123");
    expect(body.get("consent_confirmed")).toBe("true");
    expect(body.get("author_name")).toBe("Marta");
    expect(body.get("author_city")).toBe("Wrocław");
  });
});

describe("uploadAdminPlacePhoto", () => {
  it("uses the admin place photo contract without public consent fields", async () => {
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: vi.fn(() => "admin-token"),
        removeItem: vi.fn(),
        setItem: vi.fn(),
      },
    });
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          approved_at: null,
          caption: "Główne",
          consent_confirmed: true,
          created_at: "2026-06-10T00:00:00",
          id: "photo-1",
          place_id: "place-1",
          public_path: "/media/photos/photo-1.jpg",
          role: "gallery",
          source: "editorial",
          status: "pending",
          thumb_path: "/media/photos/photo-1-thumb.jpg",
        }),
        { headers: { "Content-Type": "application/json" }, status: 201 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await uploadAdminPlacePhoto("place-1", new File(["image"], "place.jpg", { type: "image/jpeg" }), " Główne ");

    const calls = fetchMock.mock.calls as Array<Parameters<typeof fetch>>;
    const [url, options] = calls[0];
    const body = options?.body as FormData;
    const headers = options?.headers as Headers;

    expect(url).toBe("http://127.0.0.1:8000/api/admin/places/place-1/photos");
    expect(options?.method).toBe("POST");
    expect(headers.get("Authorization")).toBe("Bearer admin-token");
    expect(body.get("caption")).toBe("Główne");
    expect(body.get("consent_confirmed")).toBeNull();
  });
});
