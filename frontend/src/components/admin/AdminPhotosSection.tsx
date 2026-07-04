import type { AdminPhoto, Category, City, Place } from "../../api/types";
import { PhotoQueue } from "./PhotoQueue";

type Props = {
  categories: Category[];
  cities: City[];
  onReviewed: () => Promise<void>;
  photos: AdminPhoto[];
  places: Place[];
};

export function AdminPhotosSection({ categories, cities, onReviewed, photos, places }: Props) {
  return (
    <section className="admin-section admin-section-single">
      <PhotoQueue categories={categories} cities={cities} photos={photos} places={places} onReviewed={onReviewed} />
    </section>
  );
}
