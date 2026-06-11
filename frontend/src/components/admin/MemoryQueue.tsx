import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  type Category,
  deleteAdminMemory,
  mediaUrl,
  reviewMemory,
  type Memory,
  type PhotoStatus,
  type Place,
  updateAdminMemory,
} from "../../api/client";
import {
  MEMORY_AUTHOR_MAX_LENGTH,
  MEMORY_CAPTION_MAX_LENGTH,
  MEMORY_TEXT_MAX_LENGTH,
} from "../places/memoryValidation";
import { AdminMediaAlbums } from "./AdminMediaAlbums";
import { SystemModal } from "./SystemModal";
import { groupAdminMediaByPlace } from "./adminMediaGroups";

type Props = {
  categories: Category[];
  memories: Memory[];
  places: Place[];
  statusCounts: Record<PhotoStatus | "all", number>;
  statusFilter: PhotoStatus | "all";
  onReviewed: () => Promise<void>;
  onStatusFilterChange: (status: PhotoStatus | "all") => void;
};

const STATUS_FILTERS: Array<{ label: string; value: PhotoStatus | "all" }> = [
  { label: "Wszystkie", value: "all" },
  { label: "Do sprawdzenia", value: "pending" },
  { label: "Zatwierdzone", value: "approved" },
  { label: "Odrzucone", value: "rejected" },
];

const STATUS_LABELS: Record<PhotoStatus, string> = {
  pending: "do sprawdzenia",
  approved: "zatwierdzone",
  rejected: "odrzucone",
};

function memoryCountLabel(count: number) {
  if (count === 1) {
    return "1 pamiątka";
  }
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits < 12 || lastTwoDigits > 14) {
    if (lastDigit >= 2 && lastDigit <= 4) {
      return `${count} pamiątki`;
    }
  }
  return `${count} pamiątek`;
}

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
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memoryTextDraft, setMemoryTextDraft] = useState("");
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
  const memoryGroups = useMemo(
    () => groupAdminMediaByPlace(memories, places, categories),
    [categories, memories, places],
  );

  useEffect(() => {
    setExpandedPlaceId((currentPlaceId) => {
      if (currentPlaceId && memoryGroups.some((group) => group.placeId === currentPlaceId)) {
        return currentPlaceId;
      }
      return null;
    });
  }, [memoryGroups]);

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
    setExpandedPlaceId((currentPlaceId) => (currentPlaceId === placeId ? null : placeId));
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
          <div className="status-tabs" role="tablist" aria-label="Status pamiątek">
            {STATUS_FILTERS.map((filter) => (
              <button
                className={statusFilter === filter.value ? "status-tab is-active" : "status-tab"}
                key={filter.value}
                type="button"
                onClick={() => onStatusFilterChange(filter.value)}
              >
                {filter.label} <span>{statusCounts[filter.value]}</span>
              </button>
            ))}
          </div>
        </div>
        <AdminMediaAlbums
          countLabel={memoryCountLabel}
          emptyMessage="Brak pamiątek dla wybranego statusu."
          expandedPlaceId={expandedPlaceId}
          groups={memoryGroups}
          onTogglePlace={handleTogglePlace}
          renderItem={(memory) => (
            <article className="admin-media-item" key={memory.id}>
              <img alt={memory.caption} decoding="async" loading="lazy" src={mediaUrl(memory.thumb_path)} />
              <div className="admin-media-item-body">
                <div className="photo-meta-row">
                  <span className={`status-badge status-badge--${memory.status}`}>{STATUS_LABELS[memory.status]}</span>
                </div>
                {editingMemoryId === memory.id ? (
                  <form className="admin-media-edit-form" onSubmit={(event) => handleSaveMemory(event, memory.id)}>
                    <label>
                      Podpis
                      <input
                        maxLength={MEMORY_CAPTION_MAX_LENGTH}
                        required
                        value={captionDraft}
                        onChange={(event) => setCaptionDraft(event.target.value)}
                      />
                    </label>
                    <label>
                      Myśl / wspomnienie
                      <textarea
                        maxLength={MEMORY_TEXT_MAX_LENGTH}
                        required
                        value={memoryTextDraft}
                        onChange={(event) => setMemoryTextDraft(event.target.value)}
                      />
                    </label>
                    <div className="admin-media-edit-row">
                      <label>
                        Imię
                        <input
                          maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                          value={authorNameDraft}
                          onChange={(event) => setAuthorNameDraft(event.target.value)}
                        />
                      </label>
                      <label>
                        Miasto
                        <input
                          maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                          value={authorCityDraft}
                          onChange={(event) => setAuthorCityDraft(event.target.value)}
                        />
                      </label>
                    </div>
                    <div className="review-actions">
                      <button type="submit" disabled={isSavingMemory}>
                        {isSavingMemory ? "Zapisywanie..." : "Zapisz"}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => {
                          setEditingMemoryId(null);
                          setAuthorCityDraft("");
                          setAuthorNameDraft("");
                          setCaptionDraft("");
                          setMemoryTextDraft("");
                        }}
                      >
                        Anuluj
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="admin-media-caption">{memory.caption}</p>
                    <p className="muted-text">{memory.memory_text}</p>
                    <span className="muted-text">
                      {memory.author_name ?? "Gość"}
                      {memory.author_city ? `, ${memory.author_city}` : ""}
                    </span>
                    <button
                      className="ghost-button admin-media-link-button"
                      type="button"
                      onClick={() => handleStartMemoryEdit(memory)}
                    >
                      Edytuj pamiątkę
                    </button>
                  </>
                )}
                <div className="review-actions">
                  {memory.status !== "approved" ? (
                    <button type="button" onClick={() => handleReview(memory.id, "approved")}>
                      {memory.status === "rejected" ? "Przywróć" : "Zatwierdź"}
                    </button>
                  ) : null}
                  {memory.status !== "rejected" ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => handleReview(memory.id, "rejected")}
                    >
                      {memory.status === "approved" ? "Ukryj" : "Odrzuć"}
                    </button>
                  ) : null}
                  <button className="danger-button" type="button" onClick={() => setMemoryToDelete(memory)}>
                    Usuń trwale
                  </button>
                </div>
              </div>
            </article>
          )}
        />
      </div>
      {memoryToDelete ? (
        <SystemModal
          confirmLabel="Usuń trwale"
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
