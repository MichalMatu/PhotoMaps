import type { Category, City, Place } from "../../api/types";
import type { AdminModerationMediaStatus } from "./adminMediaUi";
import type { AdminModerationFilters } from "./adminModerationFilters";
import { PhotoQueue } from "./PhotoQueue";

type Props = {
  categories: Category[];
  cities: City[];
  moderationFilters: AdminModerationFilters;
  onChanged: () => Promise<void>;
  places: Place[];
  refreshKey: number;
  statusFilter: AdminModerationMediaStatus;
};

export function AdminPhotosSection({
  categories,
  cities,
  moderationFilters,
  onChanged,
  places,
  refreshKey,
  statusFilter,
}: Props) {
  return (
    <section className="admin-section admin-section-single">
      <PhotoQueue
        categories={categories}
        cities={cities}
        moderationFilters={moderationFilters}
        places={places}
        refreshKey={refreshKey}
        statusFilter={statusFilter}
        onChanged={onChanged}
      />
    </section>
  );
}
