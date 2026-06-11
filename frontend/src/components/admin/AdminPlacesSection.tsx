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
          <span>Wszystkie {places.length}</span>
          <span>Opublikowane {placeStatusCounts.published}</span>
          <span>Szkice {placeStatusCounts.draft}</span>
          <span>Archiwalne {placeStatusCounts.archived}</span>
        </div>
        <button type="button" onClick={onCreate}>
          Dodaj miejsce
        </button>
      </div>

      <div className="admin-list">
        <div className="place-table" role="table">
          <div className="table-row table-head" role="row">
            <span>Nazwa</span>
            <span>Status</span>
            <span>Miasto</span>
            <span>Kategoria</span>
            <span>Priorytet</span>
            <span>Akcje</span>
          </div>
          {places.map((place) => (
            <div
              className={editingPlaceId === place.id ? "table-row is-selected" : "table-row"}
              role="row"
              key={place.id}
            >
              <span>{place.title}</span>
              <span>{place.status}</span>
              <span>{cityById.get(place.city_id)?.name ?? place.city_id}</span>
              <span>
                {place.category_ids.length
                  ? place.category_ids.map((categoryId) => categoryById.get(categoryId)?.label ?? categoryId).join(", ")
                  : "-"}
              </span>
              <span>{place.weight.toFixed(1)}</span>
              <span className="table-actions">
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
              </span>
            </div>
          ))}
          {places.length === 0 ? <p className="notice">Brak miejsc w bazie.</p> : null}
        </div>
      </div>
    </section>
  );
}
