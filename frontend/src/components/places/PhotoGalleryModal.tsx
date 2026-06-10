import { useState } from "react";

import { mediaUrl, type Photo, type Place } from "../../api/client";

type Props = {
  photos: Photo[];
  place: Place;
  onClose: () => void;
  onAddPhoto: () => void;
};

export function PhotoGalleryModal({ photos, place, onClose, onAddPhoto }: Props) {
  const [selectedPhotoId, setSelectedPhotoId] = useState(photos[0]?.id);
  const selectedPhoto = photos.find((photo) => photo.id === selectedPhotoId) ?? photos[0];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Zdjęcia: ${place.title}`}>
      <div className="gallery-modal">
        <button className="modal-close-button" type="button" onClick={onClose} aria-label="Zamknij">
          x
        </button>
        <div className="gallery-main">
          {selectedPhoto ? (
            <img src={mediaUrl(selectedPhoto.public_path)} alt={selectedPhoto.caption ?? place.title} />
          ) : null}
        </div>
        <div className="gallery-sidebar">
          <div>
            <span className="eyebrow">Galeria miejsca</span>
            <h2>{place.title}</h2>
          </div>
          <div className="gallery-thumbnails">
            {photos.map((photo) => (
              <button
                className={photo.id === selectedPhoto?.id ? "gallery-thumb is-selected" : "gallery-thumb"}
                key={photo.id}
                type="button"
                onClick={() => setSelectedPhotoId(photo.id)}
              >
                <img src={mediaUrl(photo.thumb_path)} alt={photo.caption ?? place.title} />
              </button>
            ))}
            <button className="gallery-thumb gallery-add-thumb" type="button" onClick={onAddPhoto}>
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
