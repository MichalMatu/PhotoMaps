import { BookOpen, Flag, Images, MapPin, MessageSquare, Tags } from "lucide-react";

import type { AdminSection } from "./adminSections";

type Props = {
  activeSection: AdminSection;
  counts: {
    categories: number;
    guides: number;
    memories: number;
    photos: number;
    places: number;
    reports: number;
  };
  onChange: (section: AdminSection) => void;
};

const TAB_ITEMS = [
  { icon: MapPin, key: "places", label: "Miejsca" },
  { icon: Tags, key: "categories", label: "Kategorie" },
  { icon: Images, key: "photos", label: "Zdjęcia" },
  { icon: MessageSquare, key: "memories", label: "Pamiątki" },
  { icon: BookOpen, key: "guides", label: "Trasy" },
  { icon: Flag, key: "reports", label: "Zgłoszenia" },
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
