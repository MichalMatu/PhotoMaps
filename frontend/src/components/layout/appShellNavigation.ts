export type AppShellNavigationState = "collapsed" | "rail" | "drawer";

const nextNavigationState: Record<AppShellNavigationState, AppShellNavigationState> = {
  collapsed: "rail",
  drawer: "collapsed",
  rail: "drawer",
};

export function getNextAppShellNavigationState(currentState: AppShellNavigationState): AppShellNavigationState {
  return nextNavigationState[currentState];
}
