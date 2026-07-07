import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SettingField, resolveHintPopoverPlacement } from "./SettingField";

function DescribedByProbe({ describedBy, id }: { describedBy?: string; id?: string }) {
  return <span data-described-by={describedBy} data-id={id} />;
}

describe("SettingField", () => {
  it("connects the label, control and help copy accessibly", () => {
    const markup = renderToStaticMarkup(
      <SettingField
        id="marker-base-width"
        label="Szerokość px"
        hint={{
          title: "Bazowa szerokość kafla",
          body: "Szerokość miniatury miejsca przed skalowaniem.",
          effect: "Większa wartość daje mocniejsze zdjęcia.",
          range: "W pikselach.",
        }}
      >
        <input type="number" />
      </SettingField>,
    );

    expect(markup).toContain('for="marker-base-width"');
    expect(markup).toContain('id="marker-base-width"');
    expect(markup).toContain('aria-describedby="marker-base-width-hint"');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('role="tooltip"');
    expect(markup).toContain("Bazowa szerokość kafla");
    expect(markup).toContain("Wpływ:");
    expect(markup).toContain("Zakres:");
  });

  it("does not add help wiring when hint copy is missing", () => {
    const markup = renderToStaticMarkup(
      <SettingField id="fallback-zoom" label="Zoom">
        <input type="number" />
      </SettingField>,
    );

    expect(markup).toContain('for="fallback-zoom"');
    expect(markup).toContain('id="fallback-zoom"');
    expect(markup).not.toContain("aria-describedby");
    expect(markup).not.toContain('role="tooltip"');
  });

  it("renders inline help without a tooltip trigger", () => {
    const markup = renderToStaticMarkup(
      <SettingField
        id="memory-caption"
        label="Podpis"
        helpMode="inline"
        hint={{
          title: "Krótki podpis",
          body: "Podpis jest widoczny przy pamiątce.",
        }}
      >
        <input />
      </SettingField>,
    );

    expect(markup).toContain('id="memory-caption-hint"');
    expect(markup).toContain('aria-describedby="memory-caption-hint"');
    expect(markup).toContain("ui-setting-field-inline-help");
    expect(markup).not.toContain('role="tooltip"');
  });

  it("supports composite controls without forcing a native label target", () => {
    const markup = renderToStaticMarkup(
      <SettingField
        id="place-location"
        label="Lokalizacja"
        controlMode="composite"
        hint={{
          title: "Pozycja na mapie",
          body: "Współrzędne punktu dla kafla miejsca.",
        }}
      >
        <div data-control="map" />
      </SettingField>,
    );

    expect(markup).toContain('data-control="map"');
    expect(markup).toContain("Pozycja na mapie");
    expect(markup).not.toContain('for="place-location"');
  });

  it("can pass help wiring through a custom describedBy prop", () => {
    const markup = renderToStaticMarkup(
      <SettingField
        id="photo-upload-file"
        label="Zdjęcie"
        describedByProp="describedBy"
        hint={{
          title: "Plik zdjęcia",
          body: "Oryginał trafia do prywatnego storage.",
        }}
      >
        <DescribedByProbe />
      </SettingField>,
    );

    expect(markup).toContain('data-id="photo-upload-file"');
    expect(markup).toContain('data-described-by="photo-upload-file-hint"');
  });

  it("places the popover above the trigger when the viewport has more useful space there", () => {
    expect(
      resolveHintPopoverPlacement({
        popoverHeight: 140,
        triggerBottom: 770,
        triggerTop: 730,
        viewportHeight: 800,
      }),
    ).toBe("top");
  });

  it("keeps the popover below the trigger when bottom space is available or top space is also cramped", () => {
    expect(
      resolveHintPopoverPlacement({
        popoverHeight: 140,
        triggerBottom: 260,
        triggerTop: 220,
        viewportHeight: 800,
      }),
    ).toBe("bottom");
    expect(
      resolveHintPopoverPlacement({
        popoverHeight: 140,
        triggerBottom: 100,
        triggerTop: 60,
        viewportHeight: 180,
      }),
    ).toBe("bottom");
  });
});
