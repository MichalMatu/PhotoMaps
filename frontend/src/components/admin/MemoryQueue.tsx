import { FormEvent, useMemo, useState } from "react";

import { bumpMediaCacheRevision } from "../../api/http";
import {
  deleteAdminMemory,
  deleteAdminMemoryAudio,
  redactAdminMemory,
  reviewMemory,
  updateAdminMemory,
  updateAdminMemoryAudio,
} from "../../api/media";
import type { AdminMemory, Category, City, Place, ReviewFinalStatus } from "../../api/types";
import { AdminMediaCityAlbums } from "./AdminMediaCityAlbums";
import { MediaRedactionModal } from "./MediaRedactionModal";
import { MemoryQueueItem } from "./MemoryQueueItem";
import { SystemModal } from "./SystemModal";
import { groupAdminMediaByPlace, groupAdminMediaPlaceGroupsByCity } from "./adminMediaGroups";
import { memoryCountLabel } from "./adminMediaUi";
import { useAdminMediaExpansion } from "./useAdminMediaExpansion";
import type { RedactionPolygon } from "./mediaRedactionGeometry";

type Props = {
  categories: Category[];
  cities: City[];
  memories: AdminMemory[];
  places: Place[];
  onReviewed: () => Promise<void>;
};

export function MemoryQueue({ categories, cities, memories, places, onReviewed }: Props) {
  const [authorCityDraft, setAuthorCityDraft] = useState("");
  const [authorNameDraft, setAuthorNameDraft] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApplyingRedaction, setIsApplyingRedaction] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memoryTextDraft, setMemoryTextDraft] = useState("");
  const [memoryToDelete, setMemoryToDelete] = useState<AdminMemory | null>(null);
  const [memoryToRedact, setMemoryToRedact] = useState<AdminMemory | null>(null);
  const memoryGroups = useMemo(
    () => groupAdminMediaByPlace(memories, places, categories),
    [categories, memories, places],
  );
  const cityGroups = useMemo(() => groupAdminMediaPlaceGroupsByCity(memoryGroups, cities), [cities, memoryGroups]);
  const [expandedCityId, setExpandedCityId] = useState<string | null>(null);
  const { collapsePlace, expandedPlaceId, togglePlace } = useAdminMediaExpansion(memoryGroups);

  async function handleReview(memoryId: string, status: ReviewFinalStatus) {
    try {
      await reviewMemory(memoryId, status);
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zmienić statusu pamiątki.");
    }
  }

  async function handleConfirmDelete() {
    if (!memoryToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAdminMemory(memoryToDelete.id);
      setMemoryToDelete(null);
      await onReviewed();
    } catch (reason) {
      setMemoryToDelete(null);
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się trwale usunąć pamiątki.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleTogglePlace(placeId: string) {
    setEditingMemoryId(null);
    togglePlace(placeId);
  }

  function handleToggleCity(cityId: string) {
    resetMemoryEdit();
    collapsePlace();
    setExpandedCityId((currentCityId) => (currentCityId === cityId ? null : cityId));
  }

  function resetMemoryEdit() {
    setEditingMemoryId(null);
    setAuthorCityDraft("");
    setAuthorNameDraft("");
    setCaptionDraft("");
    setMemoryTextDraft("");
  }

  function handleStartMemoryEdit(memory: AdminMemory) {
    setAuthorCityDraft(memory.author_city ?? "");
    setAuthorNameDraft(memory.author_name ?? "");
    setCaptionDraft(memory.caption);
    setMemoryTextDraft(memory.memory_text);
    setEditingMemoryId(memory.id);
  }

  async function handleSaveMemory(event: FormEvent<HTMLFormElement>, memoryId: string) {
    event.preventDefault();
    setIsSavingMemory(true);
    setErrorMessage(null);
    try {
      await updateAdminMemory(memoryId, {
        author_city: authorCityDraft.trim() || null,
        author_name: authorNameDraft.trim() || null,
        caption: captionDraft.trim(),
        memory_text: memoryTextDraft.trim(),
      });
      setEditingMemoryId(null);
      setAuthorCityDraft("");
      setAuthorNameDraft("");
      setCaptionDraft("");
      setMemoryTextDraft("");
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zapisać pamiątki.");
    } finally {
      setIsSavingMemory(false);
    }
  }

  async function handleApplyRedaction(redactions: RedactionPolygon[]) {
    if (!memoryToRedact) {
      return;
    }

    setIsApplyingRedaction(true);
    try {
      await redactAdminMemory(memoryToRedact.id, {
        polygons: redactions.map((redaction) => redaction.points),
        rectangles: [],
      });
      bumpMediaCacheRevision();
      setMemoryToRedact(null);
      await onReviewed();
    } catch (reason) {
      throw reason instanceof Error ? reason : new Error("Nie udało się zapisać redakcji pamiątki.");
    } finally {
      setIsApplyingRedaction(false);
    }
  }

  async function handleSaveAudio(memory: AdminMemory, audioFile: File) {
    await updateAdminMemoryAudio(memory.id, audioFile);
    bumpMediaCacheRevision();
    await onReviewed();
  }

  async function handleDeleteAudio(memory: AdminMemory) {
    await deleteAdminMemoryAudio(memory.id);
    bumpMediaCacheRevision();
    await onReviewed();
  }

  return (
    <>
      <div className="photo-queue">
        <AdminMediaCityAlbums
          countLabel={memoryCountLabel}
          emptyMessage="Brak pamiątek dla wybranego statusu."
          expandedCityId={expandedCityId}
          expandedPlaceId={expandedPlaceId}
          groups={cityGroups}
          onToggleCity={handleToggleCity}
          onTogglePlace={handleTogglePlace}
          renderItem={(memory) => (
            <MemoryQueueItem
              authorCityDraft={authorCityDraft}
              authorNameDraft={authorNameDraft}
              captionDraft={captionDraft}
              isEditing={editingMemoryId === memory.id}
              isSavingMemory={isSavingMemory}
              key={memory.id}
              memory={memory}
              memoryTextDraft={memoryTextDraft}
              onAuthorCityDraftChange={setAuthorCityDraft}
              onAuthorNameDraftChange={setAuthorNameDraft}
              onCancelMemoryEdit={resetMemoryEdit}
              onCaptionDraftChange={setCaptionDraft}
              onDelete={setMemoryToDelete}
              onDeleteAudio={handleDeleteAudio}
              onError={setErrorMessage}
              onMemoryTextDraftChange={setMemoryTextDraft}
              onRedact={setMemoryToRedact}
              onReview={handleReview}
              onSaveAudio={handleSaveAudio}
              onSaveMemory={handleSaveMemory}
              onStartMemoryEdit={handleStartMemoryEdit}
            />
          )}
        />
      </div>
      {memoryToDelete ? (
        <SystemModal
          confirmLabel="Usuń"
          isBusy={isDeleting}
          message="Pamiątka zostanie usunięta z bazy, publicznego pliku, miniatury i prywatnego oryginału. Tej operacji nie da się cofnąć."
          title="Usunąć pamiątkę?"
          tone="danger"
          onClose={() => setMemoryToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
      {memoryToRedact ? (
        <MediaRedactionModal
          isApplying={isApplyingRedaction}
          kind="memory"
          media={memoryToRedact}
          onApply={handleApplyRedaction}
          onClose={() => setMemoryToRedact(null)}
        />
      ) : null}
      {errorMessage ? (
        <SystemModal
          confirmLabel="Rozumiem"
          message={errorMessage}
          title="Operacja nie powiodła się"
          tone="error"
          onClose={() => setErrorMessage(null)}
        />
      ) : null}
    </>
  );
}
