import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdminSegmentedControl, nextSegmentedControlIndex } from "./AdminSegmentedControl";

describe("AdminSegmentedControl", () => {
  it("renders one accessible segmented tablist with roving focus", () => {
    const markup = renderToStaticMarkup(
      <AdminSegmentedControl
        activeKey="published"
        ariaLabel="Status tras"
        items={[
          { count: 3, key: "all", label: "Wszystkie" },
          { count: 2, key: "published", label: "Opublikowane" },
          { count: 1, key: "draft", label: "Szkice" },
        ]}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Status tras"');
    expect(markup).toContain('aria-selected="true" tabindex="0"');
    expect(markup).toContain('aria-selected="false" tabindex="-1"');
    expect(markup).toContain("admin-segment-tab-count");
  });

  it("moves focus by arrow, home, and end keys", () => {
    expect(nextSegmentedControlIndex(1, 3, "ArrowRight")).toBe(2);
    expect(nextSegmentedControlIndex(1, 3, "ArrowDown")).toBe(2);
    expect(nextSegmentedControlIndex(1, 3, "ArrowLeft")).toBe(0);
    expect(nextSegmentedControlIndex(1, 3, "ArrowUp")).toBe(0);
    expect(nextSegmentedControlIndex(1, 3, "Home")).toBe(0);
    expect(nextSegmentedControlIndex(1, 3, "End")).toBe(2);
    expect(nextSegmentedControlIndex(2, 3, "ArrowRight")).toBe(0);
    expect(nextSegmentedControlIndex(0, 3, "ArrowLeft")).toBe(2);
    expect(nextSegmentedControlIndex(1, 3, "Tab")).toBe(1);
  });
});
