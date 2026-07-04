import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("creates route slugs with hyphens by default", () => {
    expect(slugify("  Hala Targowa: Deszcz i Detale! ")).toBe("hala-targowa-deszcz-i-detale");
  });

  it("creates stable ids with underscores when requested", () => {
    expect(slugify("Kawiarnie / Małe miejsca", "_")).toBe("kawiarnie_male_miejsca");
  });

  it("normalizes Polish diacritics and trims separators", () => {
    expect(slugify("  Łódź - Żółć  ")).toBe("lodz-zolc");
  });
});
