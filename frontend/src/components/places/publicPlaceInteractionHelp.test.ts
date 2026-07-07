import { describe, expect, it } from "vitest";

import { PUBLIC_PLACE_INTERACTION_HELP, PUBLIC_PLACE_INTERACTION_HELP_KEYS } from "./publicPlaceInteractionHelp";

describe("publicPlaceInteractionHelp", () => {
  it("keeps help copy for every public place interaction field", () => {
    expect(Object.keys(PUBLIC_PLACE_INTERACTION_HELP).sort()).toEqual([...PUBLIC_PLACE_INTERACTION_HELP_KEYS].sort());
  });

  it("keeps public interaction help copy actionable", () => {
    for (const key of PUBLIC_PLACE_INTERACTION_HELP_KEYS) {
      const hint = PUBLIC_PLACE_INTERACTION_HELP[key];

      expect(hint.title.trim().length).toBeGreaterThan(0);
      expect(hint.body.trim().length).toBeGreaterThan(24);
      expect(`${hint.effect ?? ""}${hint.range ?? ""}`.trim().length).toBeGreaterThan(0);
    }
  });
});
