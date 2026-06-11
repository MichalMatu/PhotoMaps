import { useMemo, useState } from "react";

import {
  archiveCategory,
  createCategory,
  deleteCategoryPermanently,
  updateCategory,
  type Category,
  type CategoryPayload,
  type CategoryStatus,
  type Place,
} from "../../api/client";
import { errorDetails, type OperationError } from "../ui/ErrorModal";

type CategoryAction = {
  category: Category;
  type: "archive" | "delete";
};

const INITIAL_STATUS: CategoryStatus = "active";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function categoryPayload({
  description,
  icon,
  id,
  label,
  sortOrder,
  status,
}: {
  description: string;
  icon: string;
  id: string;
  label: string;
  sortOrder: string;
  status: CategoryStatus;
}): CategoryPayload {
  return {
    id,
    label: label.trim(),
    description: description.trim() || null,
    icon: icon.trim() || null,
    sort_order: Number(sortOrder),
    status,
  };
}

type UseCategoryActionsArgs = {
  categories: Category[];
  onChanged: () => Promise<void>;
  places: Place[];
};

export function useCategoryActions({ categories, onChanged, places }: UseCategoryActionsArgs) {
  const [categoryAction, setCategoryAction] = useState<CategoryAction | null>(null);
  const [description, setDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [icon, setIcon] = useState("");
  const [id, setId] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [label, setLabel] = useState("");
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [sortOrder, setSortOrder] = useState("0");
  const [status, setStatus] = useState<CategoryStatus>(INITIAL_STATUS);
  const generatedId = useMemo(() => slugify(label), [label]);
  const categoryId = editingCategory ? editingCategory.id : id || generatedId;
  const categoryBlockers = categoryAction
    ? places.filter((place) => place.category_id === categoryAction.category.id)
    : [];
  const categoryBlockerDetails = categoryBlockers.length
    ? categoryBlockers.map((place) => `- ${place.title} (${place.status})`).join("\n")
    : null;
  const categoryStatusCounts = useMemo(
    () => ({
      active: categories.filter((category) => category.status === "active").length,
      archived: categories.filter((category) => category.status === "archived").length,
    }),
    [categories],
  );

  function resetForm() {
    setEditingCategory(null);
    setId("");
    setLabel("");
    setDescription("");
    setIcon("");
    setSortOrder("0");
    setStatus(INITIAL_STATUS);
  }

  function openCreateCategoryModal() {
    resetForm();
    setIsCategoryModalOpen(true);
  }

  function openEditCategoryModal(category: Category) {
    setEditingCategory(category);
    setId(category.id);
    setLabel(category.label);
    setDescription(category.description ?? "");
    setIcon(category.icon ?? "");
    setSortOrder(String(category.sort_order));
    setStatus(category.status);
    setIsCategoryModalOpen(true);
  }

  function handleCloseCategoryModal() {
    if (isSaving) {
      return;
    }
    setIsCategoryModalOpen(false);
    resetForm();
  }

  async function handleSaveCategory() {
    if (!categoryId || !label.trim()) {
      return;
    }

    setOperationError(null);
    setIsSaving(true);
    try {
      const payload = categoryPayload({
        description,
        icon,
        id: categoryId,
        label,
        sortOrder,
        status,
      });

      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          label: payload.label,
          description: payload.description,
          icon: payload.icon,
          sort_order: payload.sort_order,
          status: payload.status,
        });
      } else {
        await createCategory(payload);
      }

      setIsCategoryModalOpen(false);
      resetForm();
      await onChanged();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zapisać kategorii. Sprawdź dane i spróbuj ponownie.",
        title: "Nie udało się zapisać kategorii",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmCategoryAction() {
    if (!categoryAction) {
      return;
    }

    setOperationError(null);
    setIsProcessingAction(true);
    try {
      if (categoryAction.type === "archive") {
        await archiveCategory(categoryAction.category.id);
      } else {
        await deleteCategoryPermanently(categoryAction.category.id);
      }
      if (editingCategory?.id === categoryAction.category.id) {
        setIsCategoryModalOpen(false);
        resetForm();
      }
      setCategoryAction(null);
      await onChanged();
    } catch (reason) {
      const failedAction = categoryAction.type;
      setCategoryAction(null);
      setOperationError({
        details: categoryBlockerDetails ?? errorDetails(reason),
        message:
          failedAction === "delete"
            ? "Nie można trwale usunąć tej kategorii. Jeśli jest używana przez miejsca, najpierw zmień kategorię tych miejsc albo użyj archiwizacji."
            : "Nie udało się zarchiwizować kategorii. Spróbuj ponownie.",
        title: failedAction === "delete" ? "Nie udało się usunąć kategorii" : "Nie udało się zarchiwizować kategorii",
      });
    } finally {
      setIsProcessingAction(false);
    }
  }

  return {
    categoryAction,
    categoryBlockerDetails,
    categoryBlockers,
    categoryId,
    categoryStatusCounts,
    description,
    editingCategory,
    handleCloseCategoryModal,
    handleConfirmCategoryAction,
    handleSaveCategory,
    icon,
    isCategoryModalOpen,
    isProcessingAction,
    isSaving,
    label,
    openCreateCategoryModal,
    openEditCategoryModal,
    operationError,
    setCategoryAction,
    setDescription,
    setIcon,
    setId: (value: string) => setId(slugify(value)),
    setLabel,
    setOperationError,
    setSortOrder,
    setStatus,
    sortOrder,
    status,
  };
}
