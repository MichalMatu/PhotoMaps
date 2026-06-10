import { useState } from "react";

import { mediaUrl, reviewMemory, type Memory, type PhotoStatus, type Place } from "../../api/client";
import { SystemModal } from "./SystemModal";

type Props = {
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

export function MemoryQueue({
  memories,
  places,
  statusCounts,
  statusFilter,
  onReviewed,
  onStatusFilterChange,
}: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const placeById = new Map(places.map((place) => [place.id, place]));

  async function handleReview(memoryId: string, status: "approved" | "rejected") {
    try {
      await reviewMemory(memoryId, status);
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zmienić statusu pamiątki.");
    }
  }

  return (
    <>
      <div className="photo-queue">
        <div className="section-heading">
          <h2>Pamiątki</h2>
          <span>{memories.length}</span>
        </div>
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
        {memories.length === 0 ? <p className="notice">Brak pamiątek dla wybranego statusu.</p> : null}
        <div className="photo-grid">
          {memories.map((memory) => {
            const place = placeById.get(memory.place_id);
            return (
              <article className="photo-review-item" key={memory.id}>
                <img alt={memory.caption} src={mediaUrl(memory.thumb_path)} />
                <div>
                  <strong>{place?.title ?? memory.place_id}</strong>
                  <div className="photo-meta-row">
                    <span className={`status-badge status-badge--${memory.status}`}>{STATUS_LABELS[memory.status]}</span>
                  </div>
                  <p>{memory.caption}</p>
                  <span className="muted-text">
                    {memory.author_name ?? "Gość"}
                    {memory.author_city ? `, ${memory.author_city}` : ""}
                  </span>
                  <div className="review-actions">
                    {memory.status !== "approved" ? (
                      <button type="button" onClick={() => handleReview(memory.id, "approved")}>
                        {memory.status === "rejected" ? "Przywróć" : "Zatwierdź"}
                      </button>
                    ) : null}
                    {memory.status !== "rejected" ? (
                      <button className="secondary-button" type="button" onClick={() => handleReview(memory.id, "rejected")}>
                        {memory.status === "approved" ? "Ukryj" : "Odrzuć"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
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
