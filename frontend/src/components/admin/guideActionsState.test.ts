import { describe, expect, it } from "vitest";

import type { Guide } from "../../api/types";
import { filterGuidesByStatus, guidePayloadFromState, guideStatusCounts } from "./guideActionsState";

function guide(id: string, status: Guide["status"]): Guide {
  return {
    cover_photo: null,
    created_at: "",
    description: null,
    article_blocks: [],
    id,
    kind: "route",
    place_count: 0,
    preview_places: [],
    route_points: [],
    slug: id,
    status,
    title: id,
    updated_at: "",
  };
}

describe("guideStatusCounts", () => {
  it("counts guides by admin status", () => {
    expect(guideStatusCounts([guide("a", "draft"), guide("b", "published"), guide("c", "published")])).toEqual({
      archived: 0,
      draft: 1,
      published: 2,
    });
  });
});

describe("filterGuidesByStatus", () => {
  it("keeps all guides for the all filter", () => {
    const guides = [guide("a", "draft"), guide("b", "published")];

    expect(filterGuidesByStatus(guides, "all")).toBe(guides);
  });

  it("returns only guides matching the selected status", () => {
    expect(
      filterGuidesByStatus([guide("a", "draft"), guide("b", "published"), guide("c", "archived")], "draft"),
    ).toEqual([guide("a", "draft")]);
  });
});

describe("guidePayloadFromState", () => {
  it("builds create payloads from generated slugs", () => {
    expect(
      guidePayloadFromState({
        description: "  Opis  ",
        articleBlocks: [{ type: "paragraph", text: "  Pełny opis  " }],
        editingGuide: null,
        generatedSlug: "trasa",
        kind: "route",
        routePoints: [{ lat: 51.11, lon: 17.03 }],
        status: "published",
        title: "Trasa",
      }),
    ).toEqual({
      article_blocks: [{ type: "paragraph", text: "Pełny opis" }],
      description: "Opis",
      kind: "route",
      route_points: [{ lat: 51.11, lon: 17.03 }],
      slug: "trasa",
      status: "published",
      title: "Trasa",
    });
  });

  it("keeps existing slug on edit and normalizes empty descriptions", () => {
    expect(
      guidePayloadFromState({
        description: "   ",
        articleBlocks: [],
        editingGuide: guide("existing-route", "draft"),
        generatedSlug: "ignored",
        kind: "collection",
        routePoints: [],
        status: "archived",
        title: "Nowy tytuł",
      }),
    ).toEqual({
      article_blocks: [],
      description: null,
      kind: "collection",
      route_points: [],
      slug: "existing-route",
      status: "archived",
      title: "Nowy tytuł",
    });
  });

  it("rejects incomplete create state", () => {
    expect(
      guidePayloadFromState({
        description: "",
        articleBlocks: [],
        editingGuide: null,
        generatedSlug: "",
        kind: "route",
        routePoints: [],
        status: "draft",
        title: "   ",
      }),
    ).toBeNull();
  });
});
