import { type ReactNode, useState } from "react";
import {
  Binoculars,
  BookOpen,
  BrushCleaning,
  CloudRain,
  Coffee,
  Coins,
  Heart,
  Images,
  Landmark,
  Layers,
  MapPinned,
  Menu,
  MessageSquare,
  Moon,
  Palette,
  Sandwich,
  Sparkles,
  Tags,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";

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
  mapPinnedMediaControl?: {
    active: boolean;
    label: string;
    onToggle: () => void;
  };
  mapCategoryControls?: {
    items: Array<{
      active: boolean;
      count: number;
      icon: string;
      id: string;
      label: string;
    }>;
    onClear: () => void;
    onToggle: (categoryId: string) => void;
    selectedCount: number;
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

const mapCategoryIcons: Record<string, LucideIcon> = {
  binoculars: Binoculars,
  "cloud-rain": CloudRain,
  coffee: Coffee,
  coins: Coins,
  heart: Heart,
  landmark: Landmark,
  moon: Moon,
  palette: Palette,
  sandwich: Sandwich,
  sparkles: Sparkles,
  utensils: Utensils,
};

const MAX_RAIL_CATEGORY_BUTTONS = 6;

export function AppShell({
  activeSection,
  adminAction,
  children,
  mapCategoryControls,
  mapLayerControls,
  mapPinnedMediaControl,
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const railItems = primaryItems.filter((item) => item.section !== activeSection);
  const handleAdminAction = () => {
    setIsMenuOpen(false);
    adminAction?.onClick();
  };
  const categoryItems = mapCategoryControls?.items ?? [];
  const shouldShowRailCategoryIcons = categoryItems.length > 0 && categoryItems.length <= MAX_RAIL_CATEGORY_BUTTONS;
  const shouldShowCategoryMenuButton = categoryItems.length > MAX_RAIL_CATEGORY_BUTTONS;

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

        {activeSection === "map" && mapPinnedMediaControl ? (
          <nav className="rail-layer-nav" aria-label="Nakładki mapy">
            <button
              className={mapPinnedMediaControl.active ? "rail-layer-button is-active" : "rail-layer-button"}
              type="button"
              aria-pressed={mapPinnedMediaControl.active}
              title={mapPinnedMediaControl.label}
              onClick={mapPinnedMediaControl.onToggle}
            >
              <Images aria-hidden="true" size={22} />
              <span>{mapPinnedMediaControl.label}</span>
            </button>
          </nav>
        ) : null}

        {activeSection === "map" && mapCategoryControls && categoryItems.length > 0 ? (
          <nav className="rail-category-nav" aria-label="Kategorie mapy">
            {shouldShowRailCategoryIcons
              ? categoryItems.map((item) => {
                  const CategoryIcon = mapCategoryIcons[item.icon];
                  return (
                    <button
                      className={item.active ? "rail-category-button is-active" : "rail-category-button"}
                      type="button"
                      key={item.id}
                      aria-label={`${item.label}: ${item.count}`}
                      aria-pressed={item.active}
                      title={`${item.label} (${item.count})`}
                      onClick={() => mapCategoryControls.onToggle(item.id)}
                    >
                      <CategoryIcon aria-hidden="true" size={22} />
                    </button>
                  );
                })
              : null}
            {shouldShowCategoryMenuButton ? (
              <button
                className={
                  mapCategoryControls.selectedCount > 0 ? "rail-category-button is-active" : "rail-category-button"
                }
                type="button"
                aria-label="Otwórz kategorie mapy"
                title="Kategorie"
                onClick={() => setIsMenuOpen(true)}
              >
                <Tags aria-hidden="true" size={22} />
                <strong>{mapCategoryControls.selectedCount || categoryItems.length}</strong>
              </button>
            ) : null}
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

        {activeSection === "map" && mapPinnedMediaControl ? (
          <nav className="drawer-section drawer-section--layers" aria-label="Nakładki mapy">
            <button
              className={mapPinnedMediaControl.active ? "drawer-item is-active" : "drawer-item"}
              type="button"
              aria-pressed={mapPinnedMediaControl.active}
              onClick={() => {
                mapPinnedMediaControl.onToggle();
                setIsMenuOpen(false);
              }}
            >
              <Images aria-hidden="true" size={24} />
              <span>{mapPinnedMediaControl.label}</span>
            </button>
          </nav>
        ) : null}

        {activeSection === "map" && mapCategoryControls && categoryItems.length > 0 ? (
          <nav className="drawer-section drawer-section--categories" aria-label="Kategorie mapy">
            <div className="drawer-category-grid">
              {categoryItems.map((item) => {
                const CategoryIcon = mapCategoryIcons[item.icon];
                return (
                  <button
                    className={item.active ? "drawer-category-button is-active" : "drawer-category-button"}
                    type="button"
                    key={item.id}
                    aria-label={`${item.label}: ${item.count}`}
                    aria-pressed={item.active}
                    title={`${item.label} (${item.count})`}
                    onClick={() => mapCategoryControls.onToggle(item.id)}
                  >
                    <CategoryIcon aria-hidden="true" size={24} />
                    <strong>{item.count}</strong>
                  </button>
                );
              })}
              {mapCategoryControls.selectedCount > 0 ? (
                <button
                  className="drawer-category-button drawer-category-button--clear"
                  type="button"
                  aria-label="Wyczyść kategorie"
                  title="Wyczyść kategorie"
                  onClick={mapCategoryControls.onClear}
                >
                  <BrushCleaning aria-hidden="true" size={24} />
                </button>
              ) : null}
            </div>
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
