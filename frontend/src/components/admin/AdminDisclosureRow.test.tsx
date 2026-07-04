import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Guide } from "../../api/types";
import { AdminDisclosureRow } from "./AdminDisclosureRow";
import { GuideManager } from "./GuideManager";

vi.mock("./GuideRoutePointEditor", () => ({
  GuideRoutePointEditor: () => <div data-testid="guide-route-point-editor" />,
}));

const noop = async () => undefined;

function guide(overrides: Partial<Guide> = {}): Guide {
  return {
    cover_photo: null,
    created_at: "",
    description: "Opis trasy",
    article_blocks: [],
    id: "guide-1",
    place_count: 0,
    preview_places: [],
    route_points: [],
    slug: "na-deszcz",
    status: "published",
    title: "Na deszcz",
    updated_at: "",
    ...overrides,
  };
}

describe("AdminDisclosureRow", () => {
  it("renders a shared accessible disclosure header with separate actions", () => {
    const markup = renderToStaticMarkup(
      <AdminDisclosureRow
        actions={<button type="button">Edytuj</button>}
        collapseLabel="Zwiń szczegóły"
        expandLabel="Pokaż szczegóły"
        isExpanded={false}
        panelId="details-panel"
        summary="Rekord"
        onToggle={() => undefined}
      >
        Szczegóły rekordu
      </AdminDisclosureRow>,
    );

    expect(markup).toContain('aria-controls="details-panel"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-label="Pokaż szczegóły"');
    expect(markup).toContain("admin-disclosure-actions");
    expect(markup).not.toContain('id="details-panel"');
  });

  it("renders expanded content when the row is open", () => {
    const markup = renderToStaticMarkup(
      <AdminDisclosureRow
        collapseLabel="Zwiń szczegóły"
        expandLabel="Pokaż szczegóły"
        isExpanded
        panelId="details-panel"
        summary="Rekord"
        onToggle={() => undefined}
      >
        Szczegóły rekordu
      </AdminDisclosureRow>,
    );

    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-label="Zwiń szczegóły"');
    expect(markup).toContain('id="details-panel"');
    expect(markup).toContain("Szczegóły rekordu");
  });
});

describe("GuideManager disclosure rows", () => {
  it("uses the route card header as the place-list disclosure control", () => {
    const markup = renderToStaticMarkup(<GuideManager cities={[]} guides={[guide()]} places={[]} onChanged={noop} />);

    expect(markup).toContain('aria-controls="guide-place-panel-guide-1"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-label="Pokaż miejsca trasy Na deszcz"');
    expect(markup).toContain('aria-label="Edytuj trasę Na deszcz"');
    expect(markup).toContain('aria-label="Usuń trasę Na deszcz"');
  });
});
