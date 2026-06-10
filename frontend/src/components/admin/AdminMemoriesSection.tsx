import type { Category, Memory, PhotoStatus, Place } from "../../api/client";
import { MemoryQueue } from "./MemoryQueue";

type Props = {
  categories: Category[];
  memories: Memory[];
  onReviewed: () => Promise<void>;
  onStatusFilterChange: (status: PhotoStatus | "all") => void;
  places: Place[];
  statusCounts: Record<PhotoStatus | "all", number>;
  statusFilter: PhotoStatus | "all";
};

export function AdminMemoriesSection({
  categories,
  memories,
  onReviewed,
  onStatusFilterChange,
  places,
  statusCounts,
  statusFilter,
}: Props) {
  return (
    <section className="admin-section admin-section-single">
      <MemoryQueue
        categories={categories}
        memories={memories}
        places={places}
        statusCounts={statusCounts}
        statusFilter={statusFilter}
        onReviewed={onReviewed}
        onStatusFilterChange={onStatusFilterChange}
      />
    </section>
  );
}
