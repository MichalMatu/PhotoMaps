type MapInteractionHandler = {
  disable: () => void;
  enable: () => void;
  enabled: () => boolean;
};

export type MapInteractionController = {
  boxZoom: MapInteractionHandler;
  doubleClickZoom: MapInteractionHandler;
  dragging: MapInteractionHandler;
  keyboard: MapInteractionHandler;
  scrollWheelZoom: MapInteractionHandler;
  touchZoom: MapInteractionHandler;
};

const MAP_INTERACTION_KEYS = [
  "dragging",
  "touchZoom",
  "scrollWheelZoom",
  "doubleClickZoom",
  "boxZoom",
  "keyboard",
] as const;

export function lockMapInteractions(map: MapInteractionController): () => void {
  const enabledHandlers = MAP_INTERACTION_KEYS.map((key) => map[key]).filter((handler) => handler.enabled());

  enabledHandlers.forEach((handler) => handler.disable());

  return () => {
    enabledHandlers.forEach((handler) => {
      if (!handler.enabled()) {
        handler.enable();
      }
    });
  };
}
