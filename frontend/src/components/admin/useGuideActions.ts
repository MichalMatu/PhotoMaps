import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  addPlaceToGuide,
  createGuide,
  deleteGuide,
  getAdminGuide,
  removePlaceFromGuide,
  updateGuide,
  type Guide,
  type GuideDetail,
  type GuidePayload,
  type GuideStatus,
} from "../../api/client";
import { errorDetails, type OperationError } from "../ui/ErrorModal";
import { moveGuidePlace, toggleGuidePlaceSelection, type GuidePlaceMoveDirection } from "./guidePlaceSelection";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type UseGuideActionsArgs = {
  guides: Guide[];
  onChanged: () => Promise<void>;
};

export function useGuideActions({ guides, onChanged }: UseGuideActionsArgs) {
  const [description, setDescription] = useState("");
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [guideToDelete, setGuideToDelete] = useState<Guide | null>(null);
  const [guideDetail, setGuideDetail] = useState<GuideDetail | null>(null);
  const [isDeletingGuide, setIsDeletingGuide] = useState(false);
  const [isGuideDetailLoading, setIsGuideDetailLoading] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isGuideSaving, setIsGuideSaving] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const [status, setStatus] = useState<GuideStatus>("draft");
  const [title, setTitle] = useState("");
  const selectedGuide = guides.find((guide) => guide.id === selectedGuideId) ?? null;
  const generatedSlug = useMemo(() => slugify(title), [title]);
  const guideStatusCounts = useMemo(
    () => ({
      archived: guides.filter((guide) => guide.status === "archived").length,
      draft: guides.filter((guide) => guide.status === "draft").length,
      published: guides.filter((guide) => guide.status === "published").length,
    }),
    [guides],
  );

  useEffect(() => {
    if (!selectedGuideId) {
      setGuideDetail(null);
      return;
    }

    setGuideDetail(null);
    setIsGuideDetailLoading(true);
    getAdminGuide(selectedGuideId)
      .then(setGuideDetail)
      .catch((reason: unknown) => {
        setOperationError({
          details: errorDetails(reason),
          message: "Nie udało się pobrać szczegółów przewodnika. Spróbuj ponownie.",
          title: "Nie udało się pobrać przewodnika",
        });
      })
      .finally(() => {
        setIsGuideDetailLoading(false);
      });
  }, [selectedGuideId]);

  async function refreshGuideDetail(guideId: string) {
    const detail = await getAdminGuide(guideId);
    setGuideDetail(detail);
  }

  function resetGuideForm() {
    setDescription("");
    setEditingGuide(null);
    setStatus("draft");
    setTitle("");
  }

  function openCreateGuideModal() {
    resetGuideForm();
    setIsGuideModalOpen(true);
  }

  function openEditGuideModal(guide: Guide) {
    setDescription(guide.description ?? "");
    setEditingGuide(guide);
    setStatus(guide.status);
    setTitle(guide.title);
    setIsGuideModalOpen(true);
  }

  function closeGuideModal() {
    if (isGuideSaving) {
      return;
    }
    setIsGuideModalOpen(false);
    resetGuideForm();
  }

  function toggleGuide(guideId: string) {
    setSelectedGuideId((currentGuideId) => (currentGuideId === guideId ? "" : guideId));
    setPlaceQuery("");
    setSelectedPlaceIds([]);
  }

  function requestDeleteGuide(guide: Guide) {
    setGuideToDelete(guide);
  }

  function clearDeleteGuideRequest() {
    if (isDeletingGuide) {
      return;
    }
    setGuideToDelete(null);
  }

  async function saveGuide() {
    if (!title.trim() || (!editingGuide && !generatedSlug)) {
      return;
    }

    setOperationError(null);
    setIsGuideSaving(true);
    const payload: GuidePayload = {
      slug: editingGuide?.slug ?? generatedSlug,
      title,
      description: description.trim() || null,
      status,
    };

    try {
      const savedGuide = editingGuide ? await updateGuide(editingGuide.id, payload) : await createGuide(payload);
      setSelectedGuideId(savedGuide.id);
      setIsGuideModalOpen(false);
      resetGuideForm();
      await onChanged();
      await refreshGuideDetail(savedGuide.id);
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zapisać przewodnika. Sprawdź dane i spróbuj ponownie.",
        title: "Nie udało się zapisać przewodnika",
      });
    } finally {
      setIsGuideSaving(false);
    }
  }

  function toggleSelectedPlace(placeId: string) {
    setSelectedPlaceIds((currentPlaceIds) => toggleGuidePlaceSelection(currentPlaceIds, placeId));
  }

  async function addPlaces(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGuide || selectedPlaceIds.length === 0) {
      return;
    }
    setOperationError(null);
    try {
      let detail: GuideDetail | null = null;
      const currentPlaceCount = guideDetail?.places.length ?? 0;
      for (const [index, selectedPlaceId] of selectedPlaceIds.entries()) {
        detail = await addPlaceToGuide(selectedGuide.id, {
          place_id: selectedPlaceId,
          sort_order: currentPlaceCount + index,
        });
      }
      if (detail) {
        setGuideDetail(detail);
      }
      setPlaceQuery("");
      setSelectedPlaceIds([]);
      await onChanged();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się dodać miejsc do przewodnika. Spróbuj ponownie.",
        title: "Nie udało się dodać miejsc",
      });
    }
  }

  async function movePlace(placeId: string, direction: GuidePlaceMoveDirection) {
    if (!selectedGuide || !guideDetail) {
      return;
    }

    const nextPlaces = moveGuidePlace(guideDetail.places, placeId, direction);
    if (nextPlaces === guideDetail.places) {
      return;
    }

    setOperationError(null);
    try {
      for (const [index, place] of nextPlaces.entries()) {
        await addPlaceToGuide(selectedGuide.id, {
          place_id: place.id,
          sort_order: index,
        });
      }
      await refreshGuideDetail(selectedGuide.id);
      await onChanged();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zmienić kolejności miejsc. Spróbuj ponownie.",
        title: "Nie udało się zmienić kolejności",
      });
    }
  }

  async function removePlace(nextPlaceId: string) {
    if (!selectedGuide) {
      return;
    }
    setOperationError(null);
    try {
      const detail = await removePlaceFromGuide(selectedGuide.id, nextPlaceId);
      setGuideDetail(detail);
      await onChanged();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się usunąć miejsca z przewodnika. Spróbuj ponownie.",
        title: "Nie udało się usunąć miejsca",
      });
    }
  }

  async function confirmDeleteGuide() {
    if (!guideToDelete) {
      return;
    }

    setOperationError(null);
    setIsDeletingGuide(true);
    try {
      await deleteGuide(guideToDelete.id);
      if (selectedGuideId === guideToDelete.id) {
        setSelectedGuideId("");
        setGuideDetail(null);
        setPlaceQuery("");
        setSelectedPlaceIds([]);
      }
      if (editingGuide?.id === guideToDelete.id) {
        setIsGuideModalOpen(false);
        resetGuideForm();
      }
      setGuideToDelete(null);
      await onChanged();
    } catch (reason) {
      setGuideToDelete(null);
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się trwale usunąć przewodnika. Spróbuj ponownie.",
        title: "Nie udało się usunąć przewodnika",
      });
    } finally {
      setIsDeletingGuide(false);
    }
  }

  return {
    addPlaces,
    clearDeleteGuideRequest,
    closeGuideModal,
    confirmDeleteGuide,
    description,
    editingGuide,
    generatedSlug,
    guideDetail,
    guideStatusCounts,
    guideToDelete,
    isDeletingGuide,
    isGuideDetailLoading,
    isGuideModalOpen,
    isGuideSaving,
    openCreateGuideModal,
    openEditGuideModal,
    operationError,
    movePlace,
    placeQuery,
    removePlace,
    requestDeleteGuide,
    saveGuide,
    selectedGuide,
    selectedGuideId,
    setDescription,
    setOperationError,
    selectedPlaceIds,
    setPlaceQuery,
    setStatus,
    setTitle,
    status,
    title,
    toggleGuide,
    toggleSelectedPlace,
  };
}
