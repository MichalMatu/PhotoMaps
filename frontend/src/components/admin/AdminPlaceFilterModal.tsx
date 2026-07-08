import { type FormEvent, useEffect, useRef } from "react";

import type { Category, City } from "../../api/types";
import {
  DEFAULT_ADMIN_PLACE_FILTERS,
  type AdminPlaceCompletenessFilter,
  type AdminPlaceFilters,
} from "./adminPlaceFilters";
import { SystemModal } from "./SystemModal";

type Props = {
  categories: Category[];
  cities: City[];
  filters: AdminPlaceFilters;
  onChange: (filters: AdminPlaceFilters) => void;
  onClose: () => void;
};

const COMPLETENESS_OPTIONS: Array<{ label: string; value: AdminPlaceCompletenessFilter }> = [
  { label: "Wszystkie", value: "all" },
  { label: "Kompletne", value: "ready" },
  { label: "Bez covera", value: "missing-cover" },
  { label: "Bez mediów", value: "missing-media" },
  { label: "Bez opisu", value: "missing-text" },
  { label: "Bez pełnego opisu", value: "missing-article" },
];

export function AdminPlaceFilterModal({ categories, cities, filters, onChange, onClose }: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      const searchInput = searchInputRef.current;
      if (!searchInput) {
        return;
      }
      searchInput.focus({ preventScroll: true });
      const cursorPosition = searchInput.value.length;
      searchInput.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, []);

  function updateFilter(nextFilters: Partial<AdminPlaceFilters>) {
    onChange({ ...filters, ...nextFilters });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onClose();
  }

  return (
    <SystemModal
      confirmLabel="Gotowe"
      eyebrow="Miejsca"
      headerActions={
        <button
          className="ui-button ui-button--ghost admin-filter-reset-button"
          type="button"
          onClick={() => onChange({ ...DEFAULT_ADMIN_PLACE_FILTERS, status: filters.status })}
        >
          Wyczyść
        </button>
      }
      title="Filtry miejsc"
      onClose={onClose}
    >
      <form className="ui-form admin-filter-form" onSubmit={handleSubmit}>
        <label>
          Szukaj
          <input
            ref={searchInputRef}
            value={filters.query}
            placeholder="Nazwa, slug albo opis"
            onChange={(event) => updateFilter({ query: event.target.value })}
          />
        </label>
        <label>
          Miasto
          <select value={filters.cityId} onChange={(event) => updateFilter({ cityId: event.target.value })}>
            <option value="all">Wszystkie miasta</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kategoria
          <select value={filters.categoryId} onChange={(event) => updateFilter({ categoryId: event.target.value })}>
            <option value="all">Wszystkie kategorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kompletność
          <select
            value={filters.completeness}
            onChange={(event) => updateFilter({ completeness: event.target.value as AdminPlaceCompletenessFilter })}
          >
            {COMPLETENESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </form>
    </SystemModal>
  );
}
