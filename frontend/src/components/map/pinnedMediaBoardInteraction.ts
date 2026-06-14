import type { PinnedMediaLayout } from "./pinnedMediaBoardTypes";

export type PinnedMediaInteractionMode = "drag" | "resize";

export type PinnedMediaInteractionState = {
  cardId: string;
  captureTarget: HTMLElement;
  hasPointerCapture: boolean;
  mode: PinnedMediaInteractionMode;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startLayout: PinnedMediaLayout;
};
