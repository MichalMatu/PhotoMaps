import type { Category, Place } from "../../api/client";

type Props = {
  place: Place;
  category?: Category;
};

export function PlacePopup({ place, category }: Props) {
  return (
    <div className="place-popup">
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
    </div>
  );
}
