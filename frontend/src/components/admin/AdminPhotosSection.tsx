import type { Category, Photo, PhotoStatus, Place } from "../../api/client";
import { PhotoQueue } from "./PhotoQueue";

type Props = {
  categories: Category[];
  onReviewed: () => Promise<void>;
  onStatusFilterChange: (status: PhotoStatus | "all") => void;
  photos: Photo[];
  places: Place[];
  statusCounts: Record<PhotoStatus | "all", number>;
  statusFilter: PhotoStatus | "all";
};

export function AdminPhotosSection({
  categories,
  onReviewed,
  onStatusFilterChange,
  photos,
  places,
  statusCounts,
  statusFilter,
}: Props) {
  return (
    <section className="admin-section admin-section-single">
      <PhotoQueue
        categories={categories}
        photos={photos}
        places={places}
        statusCounts={statusCounts}
        statusFilter={statusFilter}
        onReviewed={onReviewed}
        onStatusFilterChange={onStatusFilterChange}
      />
    </section>
  );
}
