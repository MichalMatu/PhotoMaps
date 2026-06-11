import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  addPlaceToGuide,
  createGuide,
  getAdminGuide,
  removePlaceFromGuide,
  updateGuide,
  type Guide,
  type GuideDetail,
  type GuidePayload,
  type GuideStatus,
} from "../../api/client";
import { errorDetails, type OperationError } from "../ui/ErrorModal";

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
  const [guideDetail, setGuideDetail] = useState<GuideDetail | null>(null);
  const [isGuideDetailLoading, setIsGuideDetailLoading] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isGuideSaving, setIsGuideSaving] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [placeId, setPlaceId] = useState("");
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState("0");
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
    setPlaceId("");
    setSortOrder("0");
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

  async function addPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGuide || !placeId) {
      return;
    }
    setOperationError(null);
    try {
      const detail = await addPlaceToGuide(selectedGuide.id, {
        place_id: placeId,
        sort_order: Number(sortOrder),
      });
      setGuideDetail(detail);
      setPlaceId("");
      setSortOrder("0");
      await onChanged();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się dodać miejsca do przewodnika. Spróbuj ponownie.",
        title: "Nie udało się dodać miejsca",
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

  return {
    addPlace,
    closeGuideModal,
    description,
    editingGuide,
    generatedSlug,
    guideDetail,
    guideStatusCounts,
    isGuideDetailLoading,
    isGuideModalOpen,
    isGuideSaving,
    openCreateGuideModal,
    openEditGuideModal,
    operationError,
    placeId,
    removePlace,
    saveGuide,
    selectedGuide,
    selectedGuideId,
    setDescription,
    setOperationError,
    setPlaceId,
    setSortOrder,
    setStatus,
    setTitle,
    sortOrder,
    status,
    title,
    toggleGuide,
  };
}
