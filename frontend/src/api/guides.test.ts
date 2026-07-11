import { afterEach, describe, expect, it, vi } from "vitest";

import { clearAdminSessionToken, setAdminSessionToken } from "./auth";
import { reorderGuidePlaces } from "./guides";

afterEach(() => {
  clearAdminSessionToken();
  vi.unstubAllGlobals();
});

describe("guides API", () => {
  it("updates guide place order in one request", async () => {
    setAdminSessionToken("admin-token");
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          cover_photo: null,
          created_at: "2026-06-21T00:00:00",
          description: null,
          id: "guide-1",
          kind: "route",
          place_count: 0,
          places: [],
          preview_places: [],
          route_points: [],
          slug: "weekend",
          status: "draft",
          title: "Weekend",
          updated_at: "2026-06-21T00:00:00",
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await reorderGuidePlaces("guide-1", {
      places: [
        { place_id: "place-b", sort_order: 0 },
        { place_id: "place-a", sort_order: 1 },
      ],
    });

    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/admin/guides/guide-1/places/order");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PUT");
    expect((fetchMock.mock.calls[0][1]?.headers as Headers).get("Authorization")).toBe("Bearer admin-token");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      places: [
        { place_id: "place-b", sort_order: 0 },
        { place_id: "place-a", sort_order: 1 },
      ],
    });
  });
});
