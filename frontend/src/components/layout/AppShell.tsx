import { type ReactNode, useState } from "react";
import { BookOpen, Layers, MapPinned, Menu, MessageSquare, Sparkles, X, type LucideIcon } from "lucide-react";

import { APP_NAME } from "../../config/app";

type AppSection = "map" | "admin" | "guides";

type Props = {
  activeSection: AppSection;
  adminAction?: {
    label: string;
    onClick: () => void;
    shortLabel: string;
  };
  children: ReactNode;
  mapLayerControls?: {
    items: Array<{
      active: boolean;
      count: number;
      id: string;
      label: string;
    }>;
    onToggle: (layerId: string) => void;
  };
};

const primaryItems = [
  { href: "/", label: "Mapa", section: "map" as const, Icon: MapPinned },
  { href: "/guides", label: "Trasy", railLabel: "Trasa", section: "guides" as const, Icon: BookOpen },
];

const mapLayerIcons: Record<string, LucideIcon> = {
  all: Layers,
  featured: Sparkles,
  places: MapPinned,
  memories: MessageSquare,
};

export function AppShell({ activeSection, adminAction, children, mapLayerControls }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const railItems = primaryItems.filter((item) => item.section !== activeSection);
  const handleAdminAction = () => {
    setIsMenuOpen(false);
    adminAction?.onClick();
  };

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-label="Główna nawigacja">
        <button className="rail-icon-button" type="button" onClick={() => setIsMenuOpen(true)} aria-label="Otwórz menu">
          <Menu aria-hidden="true" size={28} />
        </button>

        <nav className="rail-nav">
          {railItems.map(({ href, label, railLabel, section, Icon }) => (
            <a className="rail-item" href={href} key={section} aria-label={label}>
              <Icon aria-hidden="true" size={28} />
              <span>{railLabel ?? label}</span>
            </a>
          ))}
        </nav>

        {activeSection === "map" && mapLayerControls ? (
          <nav className="rail-layer-nav" aria-label="Warstwy mapy">
            {mapLayerControls.items.map((item) => {
              const LayerIcon = mapLayerIcons[item.id] ?? Sparkles;
              return (
                <button
                  className={item.active ? "rail-layer-button is-active" : "rail-layer-button"}
                  type="button"
                  key={item.id}
                  aria-pressed={item.active}
                  title={item.label}
                  onClick={() => mapLayerControls.onToggle(item.id)}
                >
                  <LayerIcon aria-hidden="true" size={22} />
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </button>
              );
            })}
          </nav>
        ) : null}

        {adminAction ? (
          <button
            className="rail-admin-button"
            type="button"
            onClick={handleAdminAction}
            aria-label={adminAction.label}
          >
            {adminAction.shortLabel}
          </button>
        ) : null}
      </aside>

      {isMenuOpen ? (
        <button className="drawer-scrim" type="button" aria-label="Zamknij menu" onClick={() => setIsMenuOpen(false)} />
      ) : null}

      <aside className={isMenuOpen ? "side-drawer is-open" : "side-drawer"} aria-hidden={!isMenuOpen}>
        <div className="drawer-header">
          {activeSection === "map" ? (
            <button className="drawer-brand drawer-brand-button" type="button" onClick={() => setIsMenuOpen(false)}>
              {APP_NAME}
            </button>
          ) : (
            <a className="drawer-brand" href="/">
              {APP_NAME}
            </a>
          )}
          <button
            className="drawer-close-button"
            type="button"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Zamknij menu"
          >
            <X aria-hidden="true" size={28} />
          </button>
        </div>

        <nav className="drawer-section">
          {primaryItems.map(({ href, label, section, Icon }) =>
            section === activeSection ? (
              <button
                className="drawer-item is-active"
                type="button"
                key={section}
                onClick={() => setIsMenuOpen(false)}
              >
                <Icon aria-hidden="true" size={26} />
                <span>{label}</span>
              </button>
            ) : (
              <a className="drawer-item" href={href} key={section}>
                <Icon aria-hidden="true" size={26} />
                <span>{label}</span>
              </a>
            ),
          )}
        </nav>

        {activeSection === "map" && mapLayerControls ? (
          <nav className="drawer-section drawer-section--layers" aria-label="Warstwy mapy">
            {mapLayerControls.items.map((item) => {
              const LayerIcon = mapLayerIcons[item.id] ?? Sparkles;
              return (
                <button
                  className={item.active ? "drawer-item is-active" : "drawer-item"}
                  type="button"
                  key={item.id}
                  aria-pressed={item.active}
                  onClick={() => {
                    mapLayerControls.onToggle(item.id);
                    setIsMenuOpen(false);
                  }}
                >
                  <LayerIcon aria-hidden="true" size={24} />
                  <span>{item.label}</span>
                  <strong className="drawer-layer-count">{item.count}</strong>
                </button>
              );
            })}
          </nav>
        ) : null}

        {adminAction ? (
          <nav className="drawer-section drawer-section--admin" aria-label="Administracja">
            <button className="drawer-item drawer-action" type="button" onClick={handleAdminAction}>
              <span className="drawer-admin-mark" aria-hidden="true">
                {adminAction.shortLabel}
              </span>
              <span>{adminAction.label}</span>
            </button>
          </nav>
        ) : null}
      </aside>

      <div className="app-content">{children}</div>
    </div>
  );
}
