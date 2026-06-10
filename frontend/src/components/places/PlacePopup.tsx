import { useState } from "react";

import { mediaUrl, type Category, type Photo, type Place } from "../../api/client";
import { PhotoGalleryModal } from "./PhotoGalleryModal";
import { PhotoUploadModal } from "./PhotoUploadModal";

type Props = {
  place: Place;
  photos: Photo[];
  category?: Category;
  onPhotoUploaded?: () => void;
};

export function PlacePopup({ place, photos, category, onPhotoUploaded }: Props) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const coverPhoto = photos[0];
  const visibleThumbs = photos.slice(0, 4);

  return (
    <div className="place-popup">
      {coverPhoto ? (
        <button className="place-popup-photo-button" type="button" onClick={() => setIsGalleryOpen(true)}>
          <img
            className="place-popup-photo"
            src={mediaUrl(coverPhoto.thumb_path)}
            alt={coverPhoto.caption ?? place.title}
          />
        </button>
      ) : null}
      <strong>{place.title}</strong>
      <span>{category?.label ?? "Miejsce"}</span>
      {place.local_comment ? <p>{place.local_comment}</p> : null}
      <dl>
        <div>
          <dt>Ocena</dt>
          <dd>{place.score.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Zdjecia</dt>
          <dd>{place.photo_count}</dd>
        </div>
        <div>
          <dt>Wspomnienia</dt>
          <dd>{place.memory_count}</dd>
        </div>
      </dl>
      <div className="popup-photo-strip" aria-label="Zdjęcia miejsca">
        {visibleThumbs.map((photo) => (
          <button key={photo.id} type="button" onClick={() => setIsGalleryOpen(true)}>
            <img src={mediaUrl(photo.thumb_path)} alt={photo.caption ?? place.title} />
          </button>
        ))}
        <button className="popup-add-photo" type="button" onClick={() => setIsUploadOpen(true)}>
          +
        </button>
      </div>
      {isGalleryOpen ? (
        <PhotoGalleryModal
          photos={photos}
          place={place}
          onClose={() => setIsGalleryOpen(false)}
          onAddPhoto={() => {
            setIsGalleryOpen(false);
            setIsUploadOpen(true);
          }}
        />
      ) : null}
      {isUploadOpen ? (
        <PhotoUploadModal
          placeId={place.id}
          placeTitle={place.title}
          onClose={() => setIsUploadOpen(false)}
          onUploaded={onPhotoUploaded}
        />
      ) : null}
    </div>
  );
}
