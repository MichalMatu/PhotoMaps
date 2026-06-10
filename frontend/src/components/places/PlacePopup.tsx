import { mediaUrl, type Category, type Photo, type Place } from "../../api/client";
import { PhotoUploadForm } from "./PhotoUploadForm";

type Props = {
  place: Place;
  photos: Photo[];
  category?: Category;
  onPhotoUploaded?: () => void;
};

export function PlacePopup({ place, photos, category, onPhotoUploaded }: Props) {
  const coverPhoto = photos[0];

  return (
    <div className="place-popup">
      {coverPhoto ? (
        <img
          className="place-popup-photo"
          src={mediaUrl(coverPhoto.thumb_path)}
          alt={coverPhoto.caption ?? place.title}
        />
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
      <PhotoUploadForm placeId={place.id} onUploaded={onPhotoUploaded} />
    </div>
  );
}
