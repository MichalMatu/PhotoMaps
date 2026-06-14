import type { City, Place } from "../../api/client";
import { ErrorModal } from "../ui/ErrorModal";
import { CityFormModal } from "./CityFormModal";
import { SystemModal } from "./SystemModal";
import { useCityActions } from "./useCityActions";

type Props = {
  cities: City[];
  onChanged: () => Promise<void>;
  places: Place[];
};

export function AdminCitiesSection({ cities, onChanged, places }: Props) {
  const cityActions = useCityActions({ cities, onChanged, places });

  return (
    <section className="admin-section admin-section-single">
      <div className="admin-panel city-manager">
        <div className="city-toolbar">
          <div className="admin-summary-pills" aria-label="Status miast">
            <span className="admin-summary-pill">Wszystkie {cities.length}</span>
            <span className="admin-summary-pill">Aktywne {cityActions.cityStatusCounts.active}</span>
            <span className="admin-summary-pill">Archiwalne {cityActions.cityStatusCounts.archived}</span>
          </div>
          <button type="button" onClick={cityActions.openCreateCityModal}>
            Dodaj miasto
          </button>
        </div>

        <div className="ui-table-panel city-list" role="table">
          <div className="city-row city-head" role="row">
            <span className="city-cell" role="columnheader">
              Nazwa
            </span>
            <span className="city-cell" role="columnheader">
              Status
            </span>
            <span className="city-cell" role="columnheader">
              Centrum
            </span>
            <span className="city-cell" role="columnheader">
              Zoom
            </span>
            <span className="city-cell" role="columnheader">
              Kolejność
            </span>
            <span className="city-cell city-cell--actions" role="columnheader">
              Akcje
            </span>
          </div>
          {cities.map((city) => (
            <div
              className={cityActions.editingCity?.id === city.id ? "city-row is-selected" : "city-row"}
              role="row"
              key={city.id}
            >
              <div className="city-cell city-cell--title" role="cell" data-label="Nazwa">
                <strong>{city.name}</strong>
                <span className="city-id">{city.id}</span>
              </div>
              <span className="city-cell" role="cell" data-label="Status">
                <span className={`ui-status ui-status--${city.status}`}>{city.status}</span>
              </span>
              <span className="city-cell" role="cell" data-label="Centrum">
                {city.lat.toFixed(4)}, {city.lon.toFixed(4)}
              </span>
              <span className="city-cell" role="cell" data-label="Zoom">
                {city.default_zoom}
              </span>
              <span className="city-cell" role="cell" data-label="Kolejność">
                {city.sort_order}
              </span>
              <div className="city-cell city-cell--actions city-actions" role="cell">
                <button type="button" onClick={() => cityActions.openEditCityModal(city)}>
                  Edytuj
                </button>
                <button
                  className="ui-button ui-button--secondary"
                  type="button"
                  disabled={city.status === "archived"}
                  onClick={() => cityActions.setCityAction({ city, type: "archive" })}
                >
                  Archiwizuj
                </button>
                <button
                  className="ui-button ui-button--danger"
                  type="button"
                  onClick={() => cityActions.setCityAction({ city, type: "delete" })}
                >
                  Usuń trwale
                </button>
              </div>
            </div>
          ))}
          {cities.length === 0 ? (
            <p className="ui-empty">Brak miast. Dodaj pierwsze miasto przyciskiem powyżej.</p>
          ) : null}
        </div>
      </div>

      {cityActions.isCityModalOpen ? (
        <CityFormModal
          canSave={cityActions.canSave}
          cityId={cityActions.cityId}
          editingCity={cityActions.editingCity}
          isSaving={cityActions.isSaving}
          lat={cityActions.lat}
          lon={cityActions.lon}
          name={cityActions.name}
          sortOrder={cityActions.sortOrder}
          status={cityActions.status}
          zoom={cityActions.zoom}
          onCityIdChange={cityActions.setId}
          onClose={cityActions.handleCloseCityModal}
          onConfirm={cityActions.handleSaveCity}
          onLatChange={cityActions.setLat}
          onLonChange={cityActions.setLon}
          onNameChange={cityActions.setName}
          onSortOrderChange={cityActions.setSortOrder}
          onStatusChange={cityActions.setStatus}
          onZoomChange={cityActions.setZoom}
        />
      ) : null}

      {cityActions.cityAction ? (
        <SystemModal
          confirmLabel={cityActions.cityAction.type === "archive" ? "Archiwizuj" : "Usuń trwale"}
          isBusy={cityActions.isProcessingAction}
          message={
            cityActions.cityAction.type === "archive"
              ? `Miasto "${cityActions.cityAction.city.name}" zniknie z publicznych list miast, ale zostanie w bazie.`
              : cityActions.cityBlockers.length > 0
                ? `Miasto "${cityActions.cityAction.city.name}" ma przypięte ${cityActions.cityBlockers.length} miejsc. Trwałe usunięcie będzie zablokowane, dopóki nie przeniesiesz ich do innego miasta.`
                : `Miasto "${cityActions.cityAction.city.name}" zostanie fizycznie usunięte.`
          }
          details={cityActions.cityAction.type === "delete" ? cityActions.cityBlockerDetails : null}
          title={cityActions.cityAction.type === "archive" ? "Archiwizować miasto?" : "Usunąć miasto trwale?"}
          tone="danger"
          onClose={() => cityActions.setCityAction(null)}
          onConfirm={cityActions.handleConfirmCityAction}
        />
      ) : null}

      {cityActions.operationError ? (
        <ErrorModal {...cityActions.operationError} onClose={() => cityActions.setOperationError(null)} />
      ) : null}
    </section>
  );
}
