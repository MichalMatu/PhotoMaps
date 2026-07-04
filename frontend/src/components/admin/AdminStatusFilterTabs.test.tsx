import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdminStatusFilterTabs } from "./AdminStatusFilterTabs";

describe("AdminStatusFilterTabs", () => {
  it("renders shared status filters as accessible segmented tabs", () => {
    const markup = renderToStaticMarkup(
      <AdminStatusFilterTabs
        activeStatus="archived"
        ariaLabel="Status testowy"
        options={[
          { count: 3, key: "all", label: "Wszystkie" },
          { count: 2, key: "published", label: "Opublikowane" },
          { count: 1, key: "archived", label: "Archiwalne" },
        ]}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Status testowy"');
    expect(markup).toContain("Wszystkie");
    expect(markup).toContain("Opublikowane");
    expect(markup).toContain("Archiwalne");
    expect(markup).toContain('aria-selected="true" tabindex="0"');
    expect(markup).toContain("admin-segment-tab-count");
  });
});
