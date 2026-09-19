import { useState } from "react";

import type { AdminPhoto, ContentBlock, ContentBlockType } from "../../api/types";
import { emptyContentBlock } from "../content/contentBlockUtils";
import {
  EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  type PhotoAttributionDraft,
  photoAttributionDraftFromPhoto,
} from "./placePhotoPanelState";

export function usePhotoTextEditDraft() {
  const [captionDraft, setCaptionDraft] = useState("");
  const [descriptionDraftBlocks, setDescriptionDraftBlocks] = useState<ContentBlock[]>([]);
  const [attributionDraft, setAttributionDraft] = useState<PhotoAttributionDraft>({
    ...EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  });
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);

  function startPhotoTextEdit(photo: AdminPhoto) {
    setCaptionDraft(photo.caption ?? "");
    setDescriptionDraftBlocks(photo.description_blocks);
    setAttributionDraft(photoAttributionDraftFromPhoto(photo));
    setEditingPhotoId(photo.id);
  }

  function clearPhotoTextEditSelection() {
    setEditingPhotoId(null);
    setDescriptionDraftBlocks([]);
  }

  function resetPhotoTextEditDraft() {
    setEditingPhotoId(null);
    setCaptionDraft("");
    setDescriptionDraftBlocks([]);
    setAttributionDraft({ ...EMPTY_PHOTO_ATTRIBUTION_DRAFT });
  }

  function addDescriptionDraftBlock(type: ContentBlockType) {
    setDescriptionDraftBlocks((currentBlocks) => [...currentBlocks, emptyContentBlock(type)]);
  }

  function updateDescriptionDraftBlock(index: number, nextBlock: ContentBlock) {
    setDescriptionDraftBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => (currentIndex === index ? nextBlock : currentBlock)),
    );
  }

  function updateDescriptionDraftBlockType(index: number, type: ContentBlockType) {
    setDescriptionDraftBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => {
        if (currentIndex !== index) return currentBlock;
        const nextBlock = emptyContentBlock(type);
        return { ...nextBlock, text: currentBlock.text };
      }),
    );
  }

  function removeDescriptionDraftBlock(index: number) {
    setDescriptionDraftBlocks((currentBlocks) =>
      currentBlocks.filter((_block, currentIndex) => currentIndex !== index),
    );
  }

  return {
    addDescriptionDraftBlock,
    attributionDraft,
    captionDraft,
    clearPhotoTextEditSelection,
    descriptionDraftBlocks,
    editingPhotoId,
    removeDescriptionDraftBlock,
    resetPhotoTextEditDraft,
    setAttributionDraft,
    setCaptionDraft,
    startPhotoTextEdit,
    updateDescriptionDraftBlock,
    updateDescriptionDraftBlockType,
  };
}
