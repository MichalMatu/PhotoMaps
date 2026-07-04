import { useMemo, useState } from "react";

import { createGuide, deleteGuide, updateGuide } from "../../api/guides";
import type { ContentBlock, ContentBlockType, Guide, GuideDetail, GuideRoutePoint, GuideStatus } from "../../api/types";
import { slugify } from "../../utils/slugify";
import { emptyContentBlock } from "../content/contentBlocks";
import { errorDetails, type OperationError } from "../ui/ErrorModal";
import { guidePayloadFromState } from "./guideActionsState";

type UseGuideCrudArgs = {
  clearGuidePlaceSelection: () => void;
  onChanged: () => Promise<void>;
  refreshGuideDetail: (guideId: string) => Promise<GuideDetail>;
  selectedGuideId: string;
  setGuideDetail: (guideDetail: GuideDetail | null) => void;
  setOperationError: (error: OperationError | null) => void;
  setSelectedGuideId: (guideId: string) => void;
};

export function useGuideCrud({
  clearGuidePlaceSelection,
  onChanged,
  refreshGuideDetail,
  selectedGuideId,
  setGuideDetail,
  setOperationError,
  setSelectedGuideId,
}: UseGuideCrudArgs) {
  const [description, setDescription] = useState("");
  const [articleBlocks, setArticleBlocks] = useState<ContentBlock[]>([]);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [guideToDelete, setGuideToDelete] = useState<Guide | null>(null);
  const [isDeletingGuide, setIsDeletingGuide] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isGuideSaving, setIsGuideSaving] = useState(false);
  const [routePoints, setRoutePoints] = useState<GuideRoutePoint[]>([]);
  const [status, setStatus] = useState<GuideStatus>("draft");
  const [title, setTitle] = useState("");
  const generatedSlug = useMemo(() => slugify(title), [title]);

  function resetGuideForm() {
    setDescription("");
    setArticleBlocks([]);
    setEditingGuide(null);
    setRoutePoints([]);
    setStatus("draft");
    setTitle("");
  }

  function openCreateGuideModal() {
    resetGuideForm();
    setIsGuideModalOpen(true);
  }

  function openEditGuideModal(guide: Guide) {
    setDescription(guide.description ?? "");
    setArticleBlocks(guide.article_blocks);
    setEditingGuide(guide);
    setRoutePoints(guide.route_points);
    setSelectedGuideId(guide.id);
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
    const payload = guidePayloadFromState({
      articleBlocks,
      description,
      editingGuide,
      generatedSlug,
      routePoints,
      status,
      title,
    });
    if (!payload) {
      return;
    }

    setOperationError(null);
    setIsGuideSaving(true);
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
        message: "Nie udało się zapisać trasy. Sprawdź dane i spróbuj ponownie.",
        title: "Nie udało się zapisać trasy",
      });
    } finally {
      setIsGuideSaving(false);
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
        clearGuidePlaceSelection();
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
        message: "Nie udało się trwale usunąć trasy. Spróbuj ponownie.",
        title: "Nie udało się usunąć trasy",
      });
    } finally {
      setIsDeletingGuide(false);
    }
  }

  function addArticleBlock(type: ContentBlockType) {
    setArticleBlocks((currentBlocks) => [...currentBlocks, emptyContentBlock(type)]);
  }

  function setArticleBlock(index: number, nextBlock: ContentBlock) {
    setArticleBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => (currentIndex === index ? nextBlock : currentBlock)),
    );
  }

  function setArticleBlockType(index: number, type: ContentBlockType) {
    setArticleBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => {
        if (currentIndex !== index) return currentBlock;
        const nextBlock = emptyContentBlock(type);
        return { ...nextBlock, text: currentBlock.text };
      }),
    );
  }

  function removeArticleBlock(index: number) {
    setArticleBlocks((currentBlocks) => currentBlocks.filter((_block, currentIndex) => currentIndex !== index));
  }

  return {
    addArticleBlock,
    articleBlocks,
    clearDeleteGuideRequest,
    closeGuideModal,
    confirmDeleteGuide,
    description,
    editingGuide,
    generatedSlug,
    guideToDelete,
    isDeletingGuide,
    isGuideModalOpen,
    isGuideSaving,
    openCreateGuideModal,
    openEditGuideModal,
    removeArticleBlock,
    requestDeleteGuide,
    routePoints,
    saveGuide,
    setArticleBlock,
    setArticleBlockType,
    setDescription,
    setRoutePoints,
    setStatus,
    setTitle,
    status,
    title,
  };
}
