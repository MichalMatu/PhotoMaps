import { mediaUrl, reviewPhoto, type Photo, type PhotoStatus, type Place } from "../../api/client";

type Props = {
  photos: Photo[];
  places: Place[];
  statusFilter: PhotoStatus | "all";
  onReviewed: () => Promise<void>;
  onStatusFilterChange: (status: PhotoStatus | "all") => void;
};

const STATUS_FILTERS: Array<{ label: string; value: PhotoStatus | "all" }> = [
  { label: "Do sprawdzenia", value: "pending" },
  { label: "Zatwierdzone", value: "approved" },
  { label: "Odrzucone", value: "rejected" },
  { label: "Wszystkie", value: "all" },
];

const STATUS_LABELS: Record<PhotoStatus, string> = {
  pending: "do sprawdzenia",
  approved: "zatwierdzone",
  rejected: "odrzucone",
};

export function PhotoQueue({ photos, places, statusFilter, onReviewed, onStatusFilterChange }: Props) {
  const placeById = new Map(places.map((place) => [place.id, place]));

  async function handleReview(photoId: string, status: "approved" | "rejected") {
    await reviewPhoto(photoId, status);
    await onReviewed();
  }

  return (
    <div className="photo-queue">
      <div className="section-heading">
        <h2>Zdjęcia</h2>
        <span>{photos.length}</span>
      </div>
      <div className="status-tabs" role="tablist" aria-label="Status zdjęć">
        {STATUS_FILTERS.map((filter) => (
          <button
            className={statusFilter === filter.value ? "status-tab is-active" : "status-tab"}
            key={filter.value}
            type="button"
            onClick={() => onStatusFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      {photos.length === 0 ? <p className="notice">Brak zdjęć dla wybranego statusu.</p> : null}
      <div className="photo-grid">
        {photos.map((photo) => {
          const place = placeById.get(photo.place_id);
          return (
            <article className="photo-review-item" key={photo.id}>
              <img alt={photo.caption ?? place?.title ?? "Zdjęcie miejsca"} src={mediaUrl(photo.thumb_path)} />
              <div>
                <strong>{place?.title ?? photo.place_id}</strong>
                <span className={`status-badge status-badge--${photo.status}`}>{STATUS_LABELS[photo.status]}</span>
                {photo.caption ? <p>{photo.caption}</p> : null}
                <div className="review-actions">
                  {photo.status !== "approved" ? (
                    <button type="button" onClick={() => handleReview(photo.id, "approved")}>
                      {photo.status === "rejected" ? "Przywróć" : "Zatwierdź"}
                    </button>
                  ) : null}
                  {photo.status !== "rejected" ? (
                    <button className="secondary-button" type="button" onClick={() => handleReview(photo.id, "rejected")}>
                      {photo.status === "approved" ? "Ukryj" : "Odrzuć"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
