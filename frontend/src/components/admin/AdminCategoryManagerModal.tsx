import type { Category, Place } from "../../api/types";
import { CategoryManager } from "./CategoryManager";
import { SystemModal } from "./SystemModal";
import { useCategoryActions } from "./useCategoryActions";

type Props = {
  categories: Category[];
  onChanged: () => Promise<void>;
  onClose: () => void;
  places: Place[];
};

export function AdminCategoryManagerModal({ categories, onChanged, onClose, places }: Props) {
  const categoryActions = useCategoryActions({ categories, onChanged, places });

  return (
    <SystemModal eyebrow="Miejsca" showActions={false} size="wide" title="Zarządzaj kategoriami" onClose={onClose}>
      <CategoryManager categories={categories} categoryActions={categoryActions} mode="with-toolbar" />
    </SystemModal>
  );
}
