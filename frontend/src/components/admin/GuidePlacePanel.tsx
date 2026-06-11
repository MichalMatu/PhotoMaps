import type { FormEvent } from "react";

import type { Guide, GuideDetail, Place } from "../../api/client";

type Props = {
  availablePlaces: Place[];
  guideDetail: GuideDetail | null;
  isLoading: boolean;
  onAddPlace: (event: FormEvent<HTMLFormElement>) => void;
  onPlaceChange: (placeId: string) => void;
  onRemovePlace: (placeId: string) => void;
  onSortOrderChange: (sortOrder: string) => void;
  placeId: string;
  selectedGuide: Guide | null;
  sortOrder: string;
};

export function GuidePlacePanel({
  availablePlaces,
  guideDetail,
  isLoading,
  onAddPlace,
  onPlaceChange,
  onRemovePlace,
  onSortOrderChange,
  placeId,
  selectedGuide,
  sortOrder,
}: Props) {
  return (
    <div className="guide-detail-panel">
      <form className="guide-place-form" onSubmit={onAddPlace}>
        <label>
          Dodaj miejsce
          <select value={placeId} onChange={(event) => onPlaceChange(event.target.value)}>
            <option value="">Wybierz miejsce</option>
            {availablePlaces.map((place) => (
              <option value={place.id} key={place.id}>
                {place.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kolejność
          <input type="number" value={sortOrder} onChange={(event) => onSortOrderChange(event.target.value)} />
        </label>
        <button type="submit" disabled={!placeId || !selectedGuide}>
          Dodaj do przewodnika
        </button>
      </form>
      <div className="guide-place-list">
        {isLoading ? <p className="notice">Ładowanie miejsc przewodnika.</p> : null}
        {!isLoading && guideDetail?.places.length === 0 ? (
          <p className="notice">Ten przewodnik nie ma jeszcze miejsc.</p>
        ) : null}
        {!isLoading
          ? guideDetail?.places.map((place) => (
              <div className="guide-place-row" key={place.id}>
                <div>
                  <strong>{place.title}</strong>
                  <span>{place.status}</span>
                </div>
                <button className="secondary-button" type="button" onClick={() => onRemovePlace(place.id)}>
                  Usuń
                </button>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
