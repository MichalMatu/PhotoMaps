import { ReactNode, useState } from "react";
import {
  Bookmark,
  Camera,
  Clock3,
  Languages,
  ListChecks,
  MapPinned,
  Menu,
  Plus,
  Settings,
  Shield,
  Share2,
  X,
} from "lucide-react";

import { APP_NAME } from "../../config/app";

type AppSection = "map" | "admin";

type Props = {
  activeSection: AppSection;
  children: ReactNode;
};

const primaryItems = [
  { href: "/", label: "Mapa", section: "map" as const, Icon: MapPinned },
  { href: "/admin", label: "Admin", section: "admin" as const, Icon: Shield },
];

const drawerItems = [
  { label: "Zapisane", Icon: Bookmark },
  { label: "Najnowsze", Icon: Clock3 },
  { label: "Zdjęcia w okolicy", Icon: Camera },
  { label: "Miejsca do sprawdzenia", Icon: ListChecks },
];

const utilityItems = [
  { label: "Udostępnij mapę", Icon: Share2 },
  { label: "Dodaj brakujące miejsce", Icon: Plus },
  { label: "Ustawienia mapy", Icon: Settings },
  { label: "Język", Icon: Languages },
];

export function AppShell({ activeSection, children }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const railItems = primaryItems.filter((item) => item.section !== activeSection);

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-label="Główna nawigacja">
        <button className="rail-icon-button" type="button" onClick={() => setIsMenuOpen(true)} aria-label="Otwórz menu">
          <Menu aria-hidden="true" size={28} />
        </button>

        <nav className="rail-nav">
          {railItems.map(({ href, label, section, Icon }) => (
            <a className="rail-item" href={href} key={section}>
              <Icon aria-hidden="true" size={28} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </aside>

      {isMenuOpen ? <button className="drawer-scrim" type="button" aria-label="Zamknij menu" onClick={() => setIsMenuOpen(false)} /> : null}

      <aside className={isMenuOpen ? "side-drawer is-open" : "side-drawer"} aria-hidden={!isMenuOpen}>
        <div className="drawer-header">
          <a className="drawer-brand" href="/">
            {APP_NAME}
          </a>
          <button className="drawer-close-button" type="button" onClick={() => setIsMenuOpen(false)} aria-label="Zamknij menu">
            <X aria-hidden="true" size={28} />
          </button>
        </div>

        <nav className="drawer-section">
          {primaryItems.map(({ href, label, section, Icon }) => (
            <a className={section === activeSection ? "drawer-item is-active" : "drawer-item"} href={href} key={section}>
              <Icon aria-hidden="true" size={26} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <nav className="drawer-section">
          {drawerItems.map(({ label, Icon }) => (
            <button className="drawer-item" disabled type="button" key={label}>
              <Icon aria-hidden="true" size={26} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <nav className="drawer-section">
          {utilityItems.map(({ label, Icon }) => (
            <button className="drawer-item" disabled type="button" key={label}>
              <Icon aria-hidden="true" size={26} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="app-content">{children}</div>
    </div>
  );
}
