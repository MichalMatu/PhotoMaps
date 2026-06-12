import type { Category, City, Place } from "../../api/client";

type Props = {
  categories: Category[];
  cities: City[];
  editingPlaceId: string | null;
  onArchive: (place: Place) => void;
  onCreate: () => void;
  onDelete: (place: Place) => void;
  onEdit: (place: Place) => void;
  places: Place[];
};

export function AdminPlacesSection({
  categories,
  cities,
  editingPlaceId,
  onArchive,
  onCreate,
  onDelete,
  onEdit,
  places,
}: Props) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const placeStatusCounts = {
    archived: places.filter((place) => place.status === "archived").length,
    draft: places.filter((place) => place.status === "draft").length,
    published: places.filter((place) => place.status === "published").length,
  };

  return (
    <section className="admin-section admin-section-single places-manager">
      <div className="place-toolbar">
        <div className="admin-summary-pills" aria-label="Status miejsc">
          <span className="admin-summary-pill">Wszystkie {places.length}</span>
          <span className="admin-summary-pill">Opublikowane {placeStatusCounts.published}</span>
          <span className="admin-summary-pill">Szkice {placeStatusCounts.draft}</span>
          <span className="admin-summary-pill">Archiwalne {placeStatusCounts.archived}</span>
        </div>
        <button type="button" onClick={onCreate}>
          Dodaj miejsce
        </button>
      </div>

      <div className="admin-list">
        <div className="place-table" role="table">
          <div className="table-row table-head" role="row">
            <span className="table-cell" role="columnheader">
              Nazwa
            </span>
            <span className="table-cell table-cell--start" role="columnheader">
              Status
            </span>
            <span className="table-cell" role="columnheader">
              Miasto
            </span>
            <span className="table-cell table-cell--start" role="columnheader">
              Kategoria
            </span>
            <span className="table-cell" role="columnheader">
              Priorytet
            </span>
            <span className="table-cell table-cell--actions" role="columnheader">
              Akcje
            </span>
          </div>
          {places.map((place) => (
            <div
              className={editingPlaceId === place.id ? "table-row is-selected" : "table-row"}
              role="row"
              key={place.id}
            >
              <span className="table-cell table-cell--title" role="cell" data-label="Nazwa">
                {place.title}
              </span>
              <span className="table-cell" role="cell" data-label="Status">
                <span className={`status-badge status-badge--${place.status}`}>{place.status}</span>
              </span>
              <span className="table-cell" role="cell" data-label="Miasto">
                {cityById.get(place.city_id)?.name ?? place.city_id}
              </span>
              <span className="table-cell table-cell--categories" role="cell" data-label="Kategoria">
                {place.category_ids.length
                  ? place.category_ids.map((categoryId) => categoryById.get(categoryId)?.label ?? categoryId).join(", ")
                  : "-"}
              </span>
              <span className="table-cell" role="cell" data-label="Priorytet">
                {place.weight.toFixed(1)}
              </span>
              <div className="table-cell table-cell--actions table-actions" role="cell">
                <button type="button" onClick={() => onEdit(place)}>
                  Edytuj
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={place.status === "archived"}
                  onClick={() => onArchive(place)}
                >
                  Archiwizuj
                </button>
                <button className="danger-button" type="button" onClick={() => onDelete(place)}>
                  Usuń trwale
                </button>
              </div>
            </div>
          ))}
          {places.length === 0 ? <p className="notice">Brak miejsc w bazie.</p> : null}
        </div>
      </div>
    </section>
  );
}
