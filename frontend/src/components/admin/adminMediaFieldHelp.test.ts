import { describe, expect, it } from "vitest";

import { ADMIN_MEDIA_FIELD_HELP, ADMIN_MEDIA_FIELD_HELP_KEYS } from "./adminMediaFieldHelp";

describe("adminMediaFieldHelp", () => {
  it("keeps help copy for every high-impact media field", () => {
    expect(Object.keys(ADMIN_MEDIA_FIELD_HELP).sort()).toEqual([...ADMIN_MEDIA_FIELD_HELP_KEYS].sort());
  });

  it("keeps media help copy actionable", () => {
    for (const key of ADMIN_MEDIA_FIELD_HELP_KEYS) {
      const hint = ADMIN_MEDIA_FIELD_HELP[key];

      expect(hint.title.trim().length).toBeGreaterThan(0);
      expect(hint.body.trim().length).toBeGreaterThan(24);
      expect(`${hint.effect ?? ""}${hint.range ?? ""}`.trim().length).toBeGreaterThan(0);
    }
  });
});
