import { mediaUrl, reviewPhoto, type Photo, type Place } from "../../api/client";

type Props = {
  photos: Photo[];
  places: Place[];
  onReviewed: () => Promise<void>;
};

export function PhotoQueue({ photos, places, onReviewed }: Props) {
  const placeById = new Map(places.map((place) => [place.id, place]));

  async function handleReview(photoId: string, status: "approved" | "rejected") {
    await reviewPhoto(photoId, status);
    await onReviewed();
  }

  return (
    <div className="photo-queue">
      <div className="section-heading">
        <h2>Zdjęcia do moderacji</h2>
        <span>{photos.length}</span>
      </div>
      {photos.length === 0 ? <p className="notice">Brak zdjęć oczekujących na moderację.</p> : null}
      <div className="photo-grid">
        {photos.map((photo) => {
          const place = placeById.get(photo.place_id);
          return (
            <article className="photo-review-item" key={photo.id}>
              <img alt={photo.caption ?? place?.title ?? "Zdjęcie miejsca"} src={mediaUrl(photo.thumb_path)} />
              <div>
                <strong>{place?.title ?? photo.place_id}</strong>
                {photo.caption ? <p>{photo.caption}</p> : null}
                <div className="review-actions">
                  <button type="button" onClick={() => handleReview(photo.id, "approved")}>
                    Zatwierdź
                  </button>
                  <button className="secondary-button" type="button" onClick={() => handleReview(photo.id, "rejected")}>
                    Odrzuć
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
