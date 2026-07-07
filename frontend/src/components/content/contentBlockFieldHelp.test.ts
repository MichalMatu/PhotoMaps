import { describe, expect, it } from "vitest";

import { CONTENT_BLOCK_FIELD_HELP, CONTENT_BLOCK_FIELD_HELP_KEYS } from "./contentBlockFieldHelp";

describe("contentBlockFieldHelp", () => {
  it("keeps help copy for every content block field", () => {
    expect(Object.keys(CONTENT_BLOCK_FIELD_HELP).sort()).toEqual([...CONTENT_BLOCK_FIELD_HELP_KEYS].sort());
  });

  it("keeps content block help copy actionable", () => {
    for (const key of CONTENT_BLOCK_FIELD_HELP_KEYS) {
      const hint = CONTENT_BLOCK_FIELD_HELP[key];

      expect(hint.title.trim().length).toBeGreaterThan(0);
      expect(hint.body.trim().length).toBeGreaterThan(24);
      expect(`${hint.effect ?? ""}${hint.range ?? ""}`.trim().length).toBeGreaterThan(0);
    }
  });
});
