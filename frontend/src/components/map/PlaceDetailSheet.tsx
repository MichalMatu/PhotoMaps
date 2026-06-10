import { Camera, Images } from "lucide-react";

import { mediaUrl, type Photo, type PlaceMapItem } from "../../api/client";
import { MemoryPanel } from "../places/MemoryPanel";
import { PhotoUploadForm } from "../places/PhotoUploadForm";
import { ReportForm } from "../places/ReportForm";
import { ResponsiveSheet } from "../ui/ResponsiveSheet";
import { getPlacePreviewPhoto } from "./placePreview";

type Props = {
  onClose: () => void;
  onPhotoSelected: (photo: Photo) => void;
  onPhotoUploaded?: () => void;
  place: PlaceMapItem | null;
};

function scoreLabel(place: PlaceMapItem) {
  if (place.memory_count >= 3) {
    return "najwięcej wspomnień";
  }
  if (place.photo_count >= 3) {
    return "popularne wśród odwiedzających";
  }
  if (place.score >= 4) {
    return "polecane przez lokalsów";
  }
  return "hidden gem";
}

export function PlaceDetailSheet({ onClose, onPhotoSelected, onPhotoUploaded, place }: Props) {
  const previewPhoto = place ? getPlacePreviewPhoto(place) : null;

  return (
    <ResponsiveSheet
      open={Boolean(place)}
      title={place?.title ?? "Miejsce"}
      subtitle={place?.category?.label ?? "Miejsce"}
      onClose={onClose}
    >
      {place ? (
        <div className="place-detail">
          {previewPhoto ? (
            <button className="place-detail__hero" type="button" onClick={() => onPhotoSelected(previewPhoto)}>
              <img src={mediaUrl(previewPhoto.public_path)} alt={previewPhoto.caption ?? place.title} />
            </button>
          ) : (
            <div className="place-detail__hero place-detail__hero--empty">
              <Images aria-hidden="true" size={28} />
            </div>
          )}

          <div className="place-detail__meta" aria-label="Podsumowanie miejsca">
            <span>{scoreLabel(place)}</span>
            <span>{place.photo_count} zdjęć</span>
            <span>{place.memory_count} pamiątek</span>
          </div>

          <section className="place-detail__section">
            {place.description ? <p>{place.description}</p> : null}
            {place.local_comment ? <p className="place-detail__local-comment">{place.local_comment}</p> : null}
          </section>

          {place.photos.length ? (
            <section className="place-detail__section">
              <div className="place-detail__heading">
                <Camera aria-hidden="true" size={18} />
                <h3>Zdjęcia</h3>
              </div>
              <div className="place-detail__photos">
                {place.photos.map((photo) => (
                  <button key={photo.id} type="button" onClick={() => onPhotoSelected(photo)}>
                    <img src={mediaUrl(photo.thumb_path)} alt={photo.caption ?? place.title} />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="place-detail__section">
            <div className="place-detail__heading">
              <Images aria-hidden="true" size={18} />
              <h3>Dodaj zdjęcie</h3>
            </div>
            <PhotoUploadForm placeId={place.id} onUploaded={onPhotoUploaded} />
          </section>

          <section className="place-detail__section place-detail__section--embedded">
            <MemoryPanel placeId={place.id} />
          </section>

          <section className="place-detail__section place-detail__section--embedded">
            <ReportForm targetId={place.id} targetType="place" />
          </section>
        </div>
      ) : null}
    </ResponsiveSheet>
  );
}
