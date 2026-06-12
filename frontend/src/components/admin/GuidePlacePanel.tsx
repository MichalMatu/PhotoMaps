import type { FormEvent } from "react";

import type { Guide, GuideDetail, Place } from "../../api/client";
import type { GuidePlaceMoveDirection } from "./guidePlaceSelection";

type Props = {
  availablePlaces: Place[];
  guideDetail: GuideDetail | null;
  isLoading: boolean;
  onAddPlaces: (event: FormEvent<HTMLFormElement>) => void;
  onMovePlace: (placeId: string, direction: GuidePlaceMoveDirection) => void;
  onPlaceQueryChange: (query: string) => void;
  onRemovePlace: (placeId: string) => void;
  onTogglePlaceSelection: (placeId: string) => void;
  placeQuery: string;
  selectablePlaces: Place[];
  selectedPlaceIds: string[];
  selectedGuide: Guide | null;
};

export function GuidePlacePanel({
  availablePlaces,
  guideDetail,
  isLoading,
  onAddPlaces,
  onMovePlace,
  onPlaceQueryChange,
  onRemovePlace,
  onTogglePlaceSelection,
  placeQuery,
  selectablePlaces,
  selectedPlaceIds,
  selectedGuide,
}: Props) {
  const guidePlaces = guideDetail?.places ?? [];

  return (
    <div className="guide-detail-panel">
      <form className="guide-place-form" onSubmit={onAddPlaces}>
        <label className="guide-place-search">
          Znajdź miejsce
          <input type="search" value={placeQuery} onChange={(event) => onPlaceQueryChange(event.target.value)} />
        </label>
        <button type="submit" disabled={selectedPlaceIds.length === 0 || !selectedGuide}>
          {selectedPlaceIds.length > 0 ? `Dodaj ${selectedPlaceIds.length}` : "Dodaj"}
        </button>
      </form>
      <div className="guide-place-picker">
        {selectablePlaces.map((place) => (
          <label className="guide-place-choice" key={place.id}>
            <input
              type="checkbox"
              checked={selectedPlaceIds.includes(place.id)}
              onChange={() => onTogglePlaceSelection(place.id)}
            />
            <span className="guide-place-choice-title">{place.title}</span>
            <small className="guide-place-choice-status">{place.status}</small>
          </label>
        ))}
        {availablePlaces.length === 0 ? <p className="notice">Brak opublikowanych miejsc do dodania.</p> : null}
        {availablePlaces.length > 0 && selectablePlaces.length === 0 ? (
          <p className="notice">Brak pasujących miejsc do dodania.</p>
        ) : null}
      </div>
      <div className="guide-place-list">
        {isLoading ? <p className="notice">Ładowanie miejsc trasy.</p> : null}
        {!isLoading && guidePlaces.length === 0 ? <p className="notice">Ta trasa nie ma jeszcze miejsc.</p> : null}
        {!isLoading
          ? guidePlaces.map((place, index) => (
              <div className="guide-place-row" key={place.id}>
                <div className="guide-place-row-copy">
                  <strong className="guide-place-row-title">{place.title}</strong>
                  <span className="guide-place-row-status">{place.status}</span>
                </div>
                <div className="guide-place-row-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMovePlace(place.id, "up")}
                  >
                    Góra
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={index === guidePlaces.length - 1}
                    onClick={() => onMovePlace(place.id, "down")}
                  >
                    Dół
                  </button>
                  <button className="secondary-button" type="button" onClick={() => onRemovePlace(place.id)}>
                    Usuń
                  </button>
                </div>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
