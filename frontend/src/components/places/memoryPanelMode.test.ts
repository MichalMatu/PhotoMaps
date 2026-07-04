import { describe, expect, it } from "vitest";

import { getMemoryPanelVisibility } from "./memoryPanelMode";

describe("getMemoryPanelVisibility", () => {
  it("keeps the map add-memory sheet form-only", () => {
    expect(getMemoryPanelVisibility("form-only")).toEqual({
      loadExistingMemories: false,
      showExistingMemories: false,
      showHeading: false,
    });
  });

  it("keeps the standalone memory panel contextual", () => {
    expect(getMemoryPanelVisibility("with-list")).toEqual({
      loadExistingMemories: true,
      showExistingMemories: true,
      showHeading: true,
    });
  });
});
