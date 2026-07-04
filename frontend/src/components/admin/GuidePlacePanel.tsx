import type { FormEvent } from "react";

import type { City, Guide, GuideDetail, Place } from "../../api/types";
import { adminPlaceStatusLabel } from "./adminStatusUi";
import type { GuidePlaceMoveDirection } from "./guidePlaceSelection";

type Props = {
  availablePlaces: Place[];
  cities: City[];
  guideDetail: GuideDetail | null;
  isLoading: boolean;
  onAddPlaces: (event: FormEvent<HTMLFormElement>) => void;
  onMovePlace: (placeId: string, direction: GuidePlaceMoveDirection) => void;
  onPlaceQueryChange: (query: string) => void;
  onRemovePlace: (placeId: string) => void;
  onSelectedCityChange: (cityId: string) => void;
  onTogglePlaceSelection: (placeId: string) => void;
  placeQuery: string;
  selectablePlaces: Place[];
  selectedCityId: string;
  selectedPlaceIds: string[];
  selectedGuide: Guide | null;
};

export function GuidePlacePanel({
  availablePlaces,
  cities,
  guideDetail,
  isLoading,
  onAddPlaces,
  onMovePlace,
  onPlaceQueryChange,
  onRemovePlace,
  onSelectedCityChange,
  onTogglePlaceSelection,
  placeQuery,
  selectablePlaces,
  selectedCityId,
  selectedPlaceIds,
  selectedGuide,
}: Props) {
  const guidePlaces = guideDetail?.places ?? [];
  const availableCities = cities.filter((city) => availablePlaces.some((place) => place.city_id === city.id));
  const selectedCityName = cities.find((city) => city.id === selectedCityId)?.name ?? selectedCityId;

  return (
    <>
      <form className="ui-form guide-place-form" onSubmit={onAddPlaces}>
        <label className="guide-place-city">
          Miasto
          <select value={selectedCityId} onChange={(event) => onSelectedCityChange(event.target.value)}>
            <option value="">Wybierz miasto</option>
            {availableCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
        <label className="guide-place-search">
          Znajdź miejsce
          <input
            type="search"
            value={placeQuery}
            disabled={!selectedCityId}
            onChange={(event) => onPlaceQueryChange(event.target.value)}
          />
        </label>
        <button
          className="ui-button ui-button--primary"
          type="submit"
          disabled={selectedPlaceIds.length === 0 || !selectedGuide}
        >
          {selectedPlaceIds.length > 0 ? `Dodaj ${selectedPlaceIds.length}` : "Dodaj"}
        </button>
      </form>
      <div className="guide-place-picker">
        {selectedCityId
          ? selectablePlaces.map((place) => {
              const statusLabel = adminPlaceStatusLabel(place.status);
              return (
                <label className="guide-place-choice" key={place.id}>
                  <input
                    type="checkbox"
                    checked={selectedPlaceIds.includes(place.id)}
                    onChange={() => onTogglePlaceSelection(place.id)}
                  />
                  <span className="guide-place-choice-title" title={place.title}>
                    {place.title}
                  </span>
                  <span
                    aria-label={statusLabel}
                    className={`guide-place-choice-status ui-status ui-status--${place.status}`}
                    title={statusLabel}
                  />
                </label>
              );
            })
          : null}
        {availablePlaces.length === 0 ? <p className="ui-empty">Brak opublikowanych miejsc do dodania.</p> : null}
        {availablePlaces.length > 0 && !selectedCityId ? (
          <p className="ui-empty">Wybierz miasto, żeby zobaczyć miejsca do dodania.</p>
        ) : null}
        {availablePlaces.length > 0 && selectedCityId && selectablePlaces.length === 0 ? (
          <p className="ui-empty">Brak pasujących miejsc w mieście {selectedCityName}.</p>
        ) : null}
      </div>
      <div className="guide-place-list">
        {isLoading ? <p className="ui-empty">Ładowanie miejsc trasy.</p> : null}
        {!isLoading && guidePlaces.length === 0 ? <p className="ui-empty">Ta trasa nie ma jeszcze miejsc.</p> : null}
        {!isLoading
          ? guidePlaces.map((place, index) => (
              <div className="guide-place-row" key={place.id}>
                <div className="guide-place-row-copy">
                  <strong className="guide-place-row-title">{place.title}</strong>
                  <span className={`guide-place-row-status ui-status ui-status--${place.status}`}>
                    {adminPlaceStatusLabel(place.status)}
                  </span>
                </div>
                <div className="guide-place-row-actions">
                  <button
                    className="ui-button ui-button--ghost"
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMovePlace(place.id, "up")}
                  >
                    Góra
                  </button>
                  <button
                    className="ui-button ui-button--ghost"
                    type="button"
                    disabled={index === guidePlaces.length - 1}
                    onClick={() => onMovePlace(place.id, "down")}
                  >
                    Dół
                  </button>
                  <button
                    className="ui-button ui-button--secondary"
                    type="button"
                    onClick={() => onRemovePlace(place.id)}
                  >
                    Usuń
                  </button>
                </div>
              </div>
            ))
          : null}
      </div>
    </>
  );
}
