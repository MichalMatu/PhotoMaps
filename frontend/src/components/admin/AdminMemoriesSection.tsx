import type { AdminMemory, Category, City, Place } from "../../api/types";
import { MemoryQueue } from "./MemoryQueue";

type Props = {
  categories: Category[];
  cities: City[];
  memories: AdminMemory[];
  onReviewed: () => Promise<void>;
  places: Place[];
};

export function AdminMemoriesSection({ categories, cities, memories, onReviewed, places }: Props) {
  return (
    <section className="admin-section admin-section-single">
      <MemoryQueue
        categories={categories}
        cities={cities}
        memories={memories}
        places={places}
        onReviewed={onReviewed}
      />
    </section>
  );
}
