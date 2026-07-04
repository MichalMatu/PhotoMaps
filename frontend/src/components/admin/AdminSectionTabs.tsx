import { BookOpen, MapPin, ShieldCheck, SlidersHorizontal } from "lucide-react";

import type { AdminSection } from "./adminSections";

type Props = {
  activeSection: AdminSection;
  counts: {
    guides: number;
    moderation: number;
    places: number;
    configuration: number;
  };
  onChange: (section: AdminSection) => void;
};

const TAB_ITEMS = [
  { icon: MapPin, key: "places", label: "Miejsca" },
  { icon: ShieldCheck, key: "moderation", label: "Moderacja" },
  { icon: BookOpen, key: "guides", label: "Trasy" },
  { icon: SlidersHorizontal, key: "configuration", label: "Konfiguracja" },
] as const satisfies ReadonlyArray<{ icon: typeof MapPin; key: AdminSection; label: string }>;

export function AdminSectionTabs({ activeSection, counts, onChange }: Props) {
  return (
    <nav className="admin-section-tabs" aria-label="Sekcje panelu admina">
      {TAB_ITEMS.map(({ icon: Icon, key, label }) => (
        <button
          className={activeSection === key ? "admin-section-tab is-active" : "admin-section-tab"}
          type="button"
          key={key}
          onClick={() => onChange(key)}
        >
          <Icon aria-hidden="true" size={20} />
          <span className="admin-section-tab-label">{label}</span>
          <strong className="admin-section-tab-count">{counts[key]}</strong>
        </button>
      ))}
    </nav>
  );
}
