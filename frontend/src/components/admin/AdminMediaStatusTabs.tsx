import type { PhotoStatus } from "../../api/client";
import { ADMIN_MEDIA_STATUS_FILTERS } from "./adminMediaUi";

type Props = {
  ariaLabel: string;
  counts: Record<PhotoStatus | "all", number>;
  onChange: (status: PhotoStatus | "all") => void;
  value: PhotoStatus | "all";
};

export function AdminMediaStatusTabs({ ariaLabel, counts, onChange, value }: Props) {
  return (
    <div className="status-tabs" role="tablist" aria-label={ariaLabel}>
      {ADMIN_MEDIA_STATUS_FILTERS.map((filter) => (
        <button
          className={value === filter.value ? "status-tab is-active" : "status-tab"}
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
        >
          {filter.label} <span className="status-tab-count">{counts[filter.value]}</span>
        </button>
      ))}
    </div>
  );
}
