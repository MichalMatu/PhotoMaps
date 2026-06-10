import { ReactNode, useState } from "react";
import { BookOpen, MapPinned, Menu, X } from "lucide-react";

import { APP_NAME } from "../../config/app";

type AppSection = "map" | "admin" | "guides";

type Props = {
  activeSection: AppSection;
  children: ReactNode;
};

const primaryItems = [
  { href: "/", label: "Mapa", section: "map" as const, Icon: MapPinned },
  { href: "/guides", label: "Przewodniki", section: "guides" as const, Icon: BookOpen },
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
          {activeSection === "map" ? (
            <button className="drawer-brand drawer-brand-button" type="button" onClick={() => setIsMenuOpen(false)}>
              {APP_NAME}
            </button>
          ) : (
            <a className="drawer-brand" href="/">
              {APP_NAME}
            </a>
          )}
          <button className="drawer-close-button" type="button" onClick={() => setIsMenuOpen(false)} aria-label="Zamknij menu">
            <X aria-hidden="true" size={28} />
          </button>
        </div>

        <nav className="drawer-section">
          {primaryItems.map(({ href, label, section, Icon }) =>
            section === activeSection ? (
              <button className="drawer-item is-active" type="button" key={section} onClick={() => setIsMenuOpen(false)}>
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
      </aside>

      <div className="app-content">{children}</div>
    </div>
  );
}
