import { getMapLayerIcon } from "./appShellItems";
import type { AppShellMapLayerControls as AppShellMapLayerControlsType } from "./appShellTypes";

type RailProps = {
  controls: AppShellMapLayerControlsType;
};

type DrawerProps = RailProps & {
  onClose: () => void;
};

export function RailMapLayerControls({ controls }: RailProps) {
  return (
    <nav className="rail-layer-nav" aria-label="Warstwy mapy">
      {controls.items.map((item) => {
        const LayerIcon = getMapLayerIcon(item.id);
        return (
          <button
            className={item.active ? "rail-layer-button is-active" : "rail-layer-button"}
            type="button"
            key={item.id}
            aria-pressed={item.active}
            title={item.label}
            onClick={() => controls.onToggle(item.id)}
          >
            <LayerIcon aria-hidden="true" size={22} />
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </button>
        );
      })}
    </nav>
  );
}

export function DrawerMapLayerControls({ controls, onClose }: DrawerProps) {
  return (
    <nav className="drawer-section drawer-section--layers" aria-label="Warstwy mapy">
      {controls.items.map((item) => {
        const LayerIcon = getMapLayerIcon(item.id);
        return (
          <button
            className={item.active ? "drawer-item is-active" : "drawer-item"}
            type="button"
            key={item.id}
            aria-pressed={item.active}
            onClick={() => {
              controls.onToggle(item.id);
              onClose();
            }}
          >
            <LayerIcon aria-hidden="true" size={24} />
            <span>{item.label}</span>
            <strong className="drawer-layer-count">{item.count}</strong>
          </button>
        );
      })}
    </nav>
  );
}
