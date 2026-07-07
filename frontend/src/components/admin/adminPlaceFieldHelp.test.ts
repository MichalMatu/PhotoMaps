import { describe, expect, it } from "vitest";

import { ADMIN_PLACE_FIELD_HELP, ADMIN_PLACE_FIELD_HELP_KEYS } from "./adminPlaceFieldHelp";

describe("adminPlaceFieldHelp", () => {
  it("keeps help copy for every high-impact place field", () => {
    expect(Object.keys(ADMIN_PLACE_FIELD_HELP).sort()).toEqual([...ADMIN_PLACE_FIELD_HELP_KEYS].sort());
  });

  it("keeps place help copy actionable", () => {
    for (const key of ADMIN_PLACE_FIELD_HELP_KEYS) {
      const hint = ADMIN_PLACE_FIELD_HELP[key];

      expect(hint.title.trim().length).toBeGreaterThan(0);
      expect(hint.body.trim().length).toBeGreaterThan(24);
      expect(`${hint.effect ?? ""}${hint.range ?? ""}`.trim().length).toBeGreaterThan(0);
    }
  });
});
