import { Building2, Filter, MapPin, Tags } from "lucide-react";
import { useMemo } from "react";

import type { AdminPlace, PlaceStatus } from "../../api/types";
import { AdminActionIconButton } from "./AdminActionIconButton";
import { AdminStatusFilterTabs } from "./AdminStatusFilterTabs";
import { AdminToolbar } from "./AdminToolbar";

type PlaceStatusFilter = PlaceStatus | "all";

type Props = {
  activeFilterCount: number;
  activeStatusFilter: PlaceStatusFilter;
  onCreateCity: () => void;
  onCreatePlace: () => void;
  onManageCategories: () => void;
  onOpenFilters: () => void;
  onStatusFilterChange: (status: PlaceStatusFilter) => void;
  places: AdminPlace[];
  visiblePlaceCount: number;
};

export function AdminPlacesToolbar({
  activeFilterCount,
  activeStatusFilter,
  onCreateCity,
  onCreatePlace,
  onManageCategories,
  onOpenFilters,
  onStatusFilterChange,
  places,
  visiblePlaceCount,
}: Props) {
  const placeStatusCounts = useMemo(
    () => ({
      archived: places.filter((place) => place.status === "archived").length,
      draft: places.filter((place) => place.status === "draft").length,
      published: places.filter((place) => place.status === "published").length,
    }),
    [places],
  );

  return (
    <AdminToolbar
      primary={
        <AdminStatusFilterTabs
          activeStatus={activeStatusFilter}
          ariaLabel="Status miejsc"
          options={[
            { count: places.length, key: "all", label: "Wszystkie" },
            { count: placeStatusCounts.published, key: "published", label: "Opublikowane" },
            { count: placeStatusCounts.draft, key: "draft", label: "Szkice" },
            { count: placeStatusCounts.archived, key: "archived", label: "Archiwalne" },
          ]}
          onChange={onStatusFilterChange}
        />
      }
      summary={
        activeFilterCount > 0 ? (
          <div className="admin-summary-pills" aria-label="Wynik filtrów miejsc">
            <span className="admin-summary-pill">Widoczne {visiblePlaceCount}</span>
          </div>
        ) : null
      }
      actions={{
        filter: (
          <AdminActionIconButton
            icon={Filter}
            label={activeFilterCount > 0 ? `Filtry miejsc, aktywne ${activeFilterCount}` : "Filtry miejsc"}
            tone={activeFilterCount > 0 ? "primary" : "ghost"}
            onClick={onOpenFilters}
          />
        ),
        primary: <AdminActionIconButton icon={MapPin} label="Dodaj miejsce" tone="primary" onClick={onCreatePlace} />,
        secondary: (
          <AdminActionIconButton icon={Building2} label="Dodaj miasto" tone="secondary" onClick={onCreateCity} />
        ),
        tertiary: (
          <AdminActionIconButton
            icon={Tags}
            label="Zarządzaj kategoriami"
            tone="secondary"
            onClick={onManageCategories}
          />
        ),
      }}
    />
  );
}
