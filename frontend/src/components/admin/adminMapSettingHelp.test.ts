import { describe, expect, it } from "vitest";

import { ADMIN_MAP_SETTING_HELP, ADMIN_MAP_SETTING_IDS } from "./adminMapSettingHelp";

describe("adminMapSettingHelp", () => {
  it("keeps help copy for every admin map setting", () => {
    expect(Object.keys(ADMIN_MAP_SETTING_HELP).sort()).toEqual([...ADMIN_MAP_SETTING_IDS].sort());
  });

  it("keeps map setting copy actionable", () => {
    for (const settingId of ADMIN_MAP_SETTING_IDS) {
      const hint = ADMIN_MAP_SETTING_HELP[settingId];

      expect(hint.title.trim().length).toBeGreaterThan(0);
      expect(hint.body.trim().length).toBeGreaterThan(24);
      expect(`${hint.effect ?? ""}${hint.range ?? ""}`.trim().length).toBeGreaterThan(0);
    }
  });
});
