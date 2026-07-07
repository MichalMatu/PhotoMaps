import { RailAdminAction } from "./AppShellAdminAction";
import { RailMapAudioControl } from "./AppShellMapAudioControl";
import { RailMapCategoryControls } from "./AppShellMapCategoryControls";
import { RailMapLayerControls } from "./AppShellMapLayerControls";
import { RailPinnedMediaControl } from "./AppShellPinnedMediaControl";
import type {
  AppSection,
  AppShellAdminAction,
  AppShellMapAudioControl,
  AppShellMapCategoryControls,
  AppShellMapLayerControls,
  AppShellMapPinnedMediaControl,
  AppShellPrimaryItem,
} from "./appShellTypes";

type Props = {
  activeSection: AppSection;
  adminAction?: AppShellAdminAction;
  isOpen: boolean;
  mapAudioControl?: AppShellMapAudioControl;
  mapCategoryControls?: AppShellMapCategoryControls;
  mapLayerControls?: AppShellMapLayerControls;
  mapPinnedMediaControl?: AppShellMapPinnedMediaControl;
  railItems: AppShellPrimaryItem[];
  onAdminAction: () => void;
  onOpenDrawer: () => void;
};

export function AppShellRail({
  activeSection,
  adminAction,
  isOpen,
  mapAudioControl,
  mapCategoryControls,
  mapLayerControls,
  mapPinnedMediaControl,
  onAdminAction,
  onOpenDrawer,
  railItems,
}: Props) {
  const isMapSection = activeSection === "map";

  return (
    <aside
      className={isOpen ? "side-rail is-open" : "side-rail"}
      id="app-side-rail"
      aria-hidden={!isOpen}
      aria-label="Główna nawigacja"
    >
      <nav className="rail-nav">
        {railItems.map(({ href, label, railLabel, section, Icon }) => (
          <a className="rail-item" href={href} key={section} aria-label={label}>
            <Icon aria-hidden="true" size={28} />
            <span>{railLabel ?? label}</span>
          </a>
        ))}
      </nav>

      {isMapSection && mapLayerControls ? <RailMapLayerControls controls={mapLayerControls} /> : null}
      {isMapSection && mapPinnedMediaControl ? <RailPinnedMediaControl control={mapPinnedMediaControl} /> : null}
      {isMapSection && mapAudioControl ? <RailMapAudioControl control={mapAudioControl} /> : null}
      {isMapSection && mapCategoryControls ? (
        <RailMapCategoryControls controls={mapCategoryControls} onOpenDrawer={onOpenDrawer} />
      ) : null}
      {adminAction ? <RailAdminAction action={adminAction} onClick={onAdminAction} /> : null}
    </aside>
  );
}
