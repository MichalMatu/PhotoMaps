import { describe, expect, it } from "vitest";

import { getNextAppShellNavigationState, type AppShellNavigationState } from "./appShellNavigation";

describe("getNextAppShellNavigationState", () => {
  it("cycles collapsed rail drawer collapsed", () => {
    const cycle: AppShellNavigationState[] = ["collapsed"];

    cycle.push(getNextAppShellNavigationState(cycle[cycle.length - 1]));
    cycle.push(getNextAppShellNavigationState(cycle[cycle.length - 1]));
    cycle.push(getNextAppShellNavigationState(cycle[cycle.length - 1]));

    expect(cycle).toEqual(["collapsed", "rail", "drawer", "collapsed"]);
  });
});
