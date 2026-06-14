import { FormEvent, useMemo, useState } from "react";

import {
  type Category,
  deleteAdminMemory,
  reviewMemory,
  type Memory,
  type PhotoStatus,
  type Place,
  updateAdminMemory,
} from "../../api/client";
import { AdminMediaAlbums } from "./AdminMediaAlbums";
import { AdminMediaStatusTabs } from "./AdminMediaStatusTabs";
import { MemoryQueueItem } from "./MemoryQueueItem";
import { SystemModal } from "./SystemModal";
import { groupAdminMediaByPlace } from "./adminMediaGroups";
import { memoryCountLabel } from "./adminMediaUi";
import { useAdminMediaExpansion } from "./useAdminMediaExpansion";

type Props = {
  categories: Category[];
  memories: Memory[];
  places: Place[];
  statusCounts: Record<PhotoStatus | "all", number>;
  statusFilter: PhotoStatus | "all";
  onReviewed: () => Promise<void>;
  onStatusFilterChange: (status: PhotoStatus | "all") => void;
};

export function MemoryQueue({
  categories,
  memories,
  places,
  statusCounts,
  statusFilter,
  onReviewed,
  onStatusFilterChange,
}: Props) {
  const [authorCityDraft, setAuthorCityDraft] = useState("");
  const [authorNameDraft, setAuthorNameDraft] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memoryTextDraft, setMemoryTextDraft] = useState("");
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
  const memoryGroups = useMemo(
    () => groupAdminMediaByPlace(memories, places, categories),
    [categories, memories, places],
  );
  const { expandedPlaceId, togglePlace } = useAdminMediaExpansion(memoryGroups);

  async function handleReview(memoryId: string, status: "approved" | "rejected") {
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

  function resetMemoryEdit() {
    setEditingMemoryId(null);
    setAuthorCityDraft("");
    setAuthorNameDraft("");
    setCaptionDraft("");
    setMemoryTextDraft("");
  }

  function handleStartMemoryEdit(memory: Memory) {
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

  return (
    <>
      <div className="photo-queue">
        <div className="photo-queue-toolbar">
          <AdminMediaStatusTabs
            ariaLabel="Status pamiątek"
            counts={statusCounts}
            value={statusFilter}
            onChange={onStatusFilterChange}
          />
        </div>
        <AdminMediaAlbums
          countLabel={memoryCountLabel}
          emptyMessage="Brak pamiątek dla wybranego statusu."
          expandedPlaceId={expandedPlaceId}
          groups={memoryGroups}
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
              onMemoryTextDraftChange={setMemoryTextDraft}
              onReview={handleReview}
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
