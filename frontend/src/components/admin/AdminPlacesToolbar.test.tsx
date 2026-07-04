import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AdminPlace } from "../../api/types";
import { AdminPlacesToolbar } from "./AdminPlacesToolbar";

function place(overrides: Partial<AdminPlace> = {}): AdminPlace {
  return {
    article_blocks: [],
    category_ids: ["classic"],
    city_id: "wroclaw",
    cover_photo_id: null,
    created_at: "",
    custom_fields: {},
    description: "Opis",
    id: "place-1",
    lat: 51.1,
    local_comment: null,
    lon: 17.03,
    memory_count: 0,
    photo_count: 0,
    score: 1,
    slug: "miejsce",
    status: "published",
    title: "Miejsce",
    updated_at: "",
    weight: 1,
    ...overrides,
  };
}

describe("AdminPlacesToolbar", () => {
  it("renders place status counts as actionable segmented tabs", () => {
    const markup = renderToStaticMarkup(
      <AdminPlacesToolbar
        activeFilterCount={0}
        activeStatusFilter="published"
        places={[
          place({ id: "published", status: "published" }),
          place({ id: "draft", status: "draft" }),
          place({ id: "archived", status: "archived" }),
        ]}
        visiblePlaceCount={1}
        onCreateCity={vi.fn()}
        onCreatePlace={vi.fn()}
        onManageCategories={vi.fn()}
        onOpenFilters={vi.fn()}
        onStatusFilterChange={vi.fn()}
      />,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Status miejsc"');
    expect(markup).toContain("Wszystkie");
    expect(markup).toContain("Opublikowane");
    expect(markup).toContain("Szkice");
    expect(markup).toContain("Archiwalne");
    expect(markup).toContain('aria-label="Zarządzaj kategoriami"');
    expect(markup).toContain('aria-label="Dodaj miejsce"');
    expect(markup).toContain('aria-selected="true" tabindex="0"');
  });

  it("keeps modal filter summary separate from status tabs", () => {
    const markup = renderToStaticMarkup(
      <AdminPlacesToolbar
        activeFilterCount={2}
        activeStatusFilter="all"
        places={[place()]}
        visiblePlaceCount={1}
        onCreateCity={vi.fn()}
        onCreatePlace={vi.fn()}
        onManageCategories={vi.fn()}
        onOpenFilters={vi.fn()}
        onStatusFilterChange={vi.fn()}
      />,
    );

    expect(markup).toContain("Widoczne 1");
    expect(markup).toContain('aria-label="Filtry miejsc, aktywne 2"');
    expect(markup).toContain('aria-label="Status miejsc"');
  });
});
