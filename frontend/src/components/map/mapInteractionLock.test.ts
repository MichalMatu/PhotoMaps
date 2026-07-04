import { describe, expect, it } from "vitest";

import { lockMapInteractions, type MapInteractionController } from "./mapInteractionLockState";

function interactionHandler(isInitiallyEnabled: boolean) {
  let isEnabled = isInitiallyEnabled;
  let disableCount = 0;
  let enableCount = 0;

  return {
    disable: () => {
      disableCount += 1;
      isEnabled = false;
    },
    enable: () => {
      enableCount += 1;
      isEnabled = true;
    },
    enabled: () => isEnabled,
    stats: () => ({ disableCount, enableCount, isEnabled }),
  };
}

function interactionMap(enabledKeys: Array<keyof MapInteractionController>) {
  const entries = {
    boxZoom: interactionHandler(enabledKeys.includes("boxZoom")),
    doubleClickZoom: interactionHandler(enabledKeys.includes("doubleClickZoom")),
    dragging: interactionHandler(enabledKeys.includes("dragging")),
    keyboard: interactionHandler(enabledKeys.includes("keyboard")),
    scrollWheelZoom: interactionHandler(enabledKeys.includes("scrollWheelZoom")),
    touchZoom: interactionHandler(enabledKeys.includes("touchZoom")),
  };

  return entries;
}

describe("lockMapInteractions", () => {
  it("disables every enabled map interaction and restores it on release", () => {
    const map = interactionMap(["boxZoom", "doubleClickZoom", "dragging", "keyboard", "scrollWheelZoom", "touchZoom"]);

    const release = lockMapInteractions(map);

    expect(map.dragging.stats()).toEqual({ disableCount: 1, enableCount: 0, isEnabled: false });
    expect(map.scrollWheelZoom.stats()).toEqual({ disableCount: 1, enableCount: 0, isEnabled: false });

    release();

    expect(map.dragging.stats()).toEqual({ disableCount: 1, enableCount: 1, isEnabled: true });
    expect(map.scrollWheelZoom.stats()).toEqual({ disableCount: 1, enableCount: 1, isEnabled: true });
  });

  it("does not enable interactions that were already disabled before the lock", () => {
    const map = interactionMap(["dragging", "touchZoom"]);

    const release = lockMapInteractions(map);

    expect(map.dragging.stats()).toEqual({ disableCount: 1, enableCount: 0, isEnabled: false });
    expect(map.keyboard.stats()).toEqual({ disableCount: 0, enableCount: 0, isEnabled: false });

    release();

    expect(map.dragging.stats()).toEqual({ disableCount: 1, enableCount: 1, isEnabled: true });
    expect(map.keyboard.stats()).toEqual({ disableCount: 0, enableCount: 0, isEnabled: false });
  });
});
