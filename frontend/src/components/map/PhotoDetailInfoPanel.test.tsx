import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { MapMediaDisplay } from "./mediaDisplayText";
import { hasPhotoDetailInfo, PhotoDetailInfoPanel } from "./PhotoDetailInfoPanel";
import type { PlaceMapVisualItem } from "./placePreview";

const emptyDisplay: MapMediaDisplay = { body: null, meta: null, title: null };

function photoItem(overrides: Partial<PlaceMapVisualItem> = {}): PlaceMapVisualItem {
  return {
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: null,
    id: "photo-1",
    kind: "photo",
    public_path: "/media/photo.jpg",
    thumb_path: "/media/photo-thumb.jpg",
    ...overrides,
  };
}

describe("PhotoDetailInfoPanel", () => {
  it("treats attribution-only photos as having detail info", () => {
    const item = photoItem({ attribution_author: "Jan Kowalski" });

    expect(hasPhotoDetailInfo({ customFields: [], display: emptyDisplay, item })).toBe(true);
  });

  it("renders display text, public custom fields, and attribution links", () => {
    const markup = renderToStaticMarkup(
      <PhotoDetailInfoPanel
        customFields={[
          { href: "https://example.com/", key: "website", label: "WWW", text: "example.com", type: "url" },
        ]}
        display={{ body: "Opis miejsca", meta: null, title: "Podpis" }}
        isExpanded={true}
        item={photoItem({
          attribution_author: "Jan Kowalski",
          attribution_license: "CC BY 4.0",
          attribution_license_url: "https://creativecommons.org/licenses/by/4.0/",
          attribution_source_url: "https://example.com/source",
        })}
        onCollapse={vi.fn()}
        onToggle={vi.fn()}
      />,
    );

    expect(markup).toContain("Podpis");
    expect(markup).toContain("Opis miejsca");
    expect(markup).toContain("WWW");
    expect(markup).toContain("Autor: Jan Kowalski");
    expect(markup).toContain("Licencja: CC BY 4.0");
    expect(markup).toContain("Źródło");
    expect(markup).toContain("Warunki licencji");
  });
});
