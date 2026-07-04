import type { Place } from "../../api/types";
import {
  DEFAULT_ADMIN_MODERATION_FILTERS,
  type AdminModerationAudioFilter,
  type AdminModerationFilters,
} from "./adminModerationFilters";
import { SystemModal } from "./SystemModal";

type Props = {
  filters: AdminModerationFilters;
  onChange: (filters: AdminModerationFilters) => void;
  onClose: () => void;
  places: Place[];
  showAudioFilter: boolean;
};

const AUDIO_OPTIONS: Array<{ label: string; value: AdminModerationAudioFilter }> = [
  { label: "Wszystkie", value: "all" },
  { label: "Tylko z audio", value: "with-audio" },
  { label: "Bez audio", value: "without-audio" },
];

export function AdminModerationFilterModal({ filters, onChange, onClose, places, showAudioFilter }: Props) {
  function updateFilter(nextFilters: Partial<AdminModerationFilters>) {
    onChange({ ...filters, ...nextFilters });
  }

  return (
    <SystemModal
      confirmLabel="Gotowe"
      eyebrow="Moderacja"
      headerActions={
        <button
          className="ui-button ui-button--ghost admin-filter-reset-button"
          type="button"
          onClick={() => onChange(DEFAULT_ADMIN_MODERATION_FILTERS)}
        >
          Wyczyść
        </button>
      }
      title="Filtry moderacji"
      onClose={onClose}
    >
      <div className="ui-form admin-filter-form">
        <label>
          Szukaj
          <input
            value={filters.query}
            placeholder="Podpis, tekst, autor albo zgłoszenie"
            onChange={(event) => updateFilter({ query: event.target.value })}
          />
        </label>
        <label>
          Miejsce
          <select value={filters.placeId} onChange={(event) => updateFilter({ placeId: event.target.value })}>
            <option value="all">Wszystkie miejsca</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.title}
              </option>
            ))}
          </select>
        </label>
        {showAudioFilter ? (
          <label>
            Audio
            <select
              value={filters.audio}
              onChange={(event) => updateFilter({ audio: event.target.value as AdminModerationAudioFilter })}
            >
              {AUDIO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </SystemModal>
  );
}
