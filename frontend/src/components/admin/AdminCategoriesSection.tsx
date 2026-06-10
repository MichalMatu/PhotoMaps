import type { Category, Place } from "../../api/client";
import { CategoryManager } from "./CategoryManager";

type Props = {
  categories: Category[];
  onChanged: () => Promise<void>;
  places: Place[];
};

export function AdminCategoriesSection({ categories, onChanged, places }: Props) {
  return (
    <section className="admin-section admin-section-single">
      <CategoryManager categories={categories} places={places} onChanged={onChanged} />
    </section>
  );
}
