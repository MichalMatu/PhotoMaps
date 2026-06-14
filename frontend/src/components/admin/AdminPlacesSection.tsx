import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

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
  const [expandedCityIds, setExpandedCityIds] = useState<Set<string>>(() => new Set());
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const cityById = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities]);
  const cityOrderById = useMemo(() => new Map(cities.map((city, index) => [city.id, index])), [cities]);
  const placeStatusCounts = useMemo(
    () => ({
      archived: places.filter((place) => place.status === "archived").length,
      draft: places.filter((place) => place.status === "draft").length,
      published: places.filter((place) => place.status === "published").length,
    }),
    [places],
  );
  const placeCityGroups = useMemo(() => {
    const groupsByCityId = new Map<string, { cityId: string; cityName: string; places: Place[] }>();

    for (const place of places) {
      const cityName = cityById.get(place.city_id)?.name ?? place.city_id;
      const group = groupsByCityId.get(place.city_id) ?? {
        cityId: place.city_id,
        cityName,
        places: [],
      };
      group.places.push(place);
      groupsByCityId.set(place.city_id, group);
    }

    return Array.from(groupsByCityId.values()).sort((firstGroup, secondGroup) => {
      const firstOrder = cityOrderById.get(firstGroup.cityId) ?? Number.MAX_SAFE_INTEGER;
      const secondOrder = cityOrderById.get(secondGroup.cityId) ?? Number.MAX_SAFE_INTEGER;
      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }
      return firstGroup.cityName.localeCompare(secondGroup.cityName, "pl");
    });
  }, [cityById, cityOrderById, places]);

  function toggleCity(cityId: string) {
    setExpandedCityIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(cityId)) {
        nextIds.delete(cityId);
      } else {
        nextIds.add(cityId);
      }
      return nextIds;
    });
  }

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
        <div className="ui-table-panel place-table" role="table">
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
          {placeCityGroups.map((cityGroup) => {
            const isExpanded = expandedCityIds.has(cityGroup.cityId);
            const cityGroupPlacesId = `place-city-group-${cityGroup.cityId}`;
            const cityGroupStatusCounts = {
              archived: cityGroup.places.filter((place) => place.status === "archived").length,
              draft: cityGroup.places.filter((place) => place.status === "draft").length,
              published: cityGroup.places.filter((place) => place.status === "published").length,
            };

            return (
              <Fragment key={cityGroup.cityId}>
                <div className="place-city-row" role="row">
                  <button
                    className="place-city-toggle"
                    type="button"
                    aria-controls={cityGroupPlacesId}
                    aria-expanded={isExpanded}
                    onClick={() => toggleCity(cityGroup.cityId)}
                  >
                    {isExpanded ? (
                      <ChevronDown aria-hidden="true" size={18} />
                    ) : (
                      <ChevronRight aria-hidden="true" size={18} />
                    )}
                    <span className="place-city-title">{cityGroup.cityName}</span>
                    <span className="place-city-count">{cityGroup.places.length} miejsc</span>
                    <span className="place-city-statuses">
                      {cityGroupStatusCounts.published} opublikowane / {cityGroupStatusCounts.draft} szkice /{" "}
                      {cityGroupStatusCounts.archived} archiwalne
                    </span>
                  </button>
                </div>
                {isExpanded ? (
                  <div className="place-city-group" id={cityGroupPlacesId} role="rowgroup">
                    {cityGroup.places.map((place) => (
                      <div
                        className={editingPlaceId === place.id ? "table-row is-selected" : "table-row"}
                        role="row"
                        key={place.id}
                      >
                        <span className="table-cell table-cell--title" role="cell" data-label="Nazwa">
                          {place.title}
                        </span>
                        <span className="table-cell" role="cell" data-label="Status">
                          <span className={`ui-status ui-status--${place.status}`}>{place.status}</span>
                        </span>
                        <span className="table-cell" role="cell" data-label="Miasto">
                          {cityGroup.cityName}
                        </span>
                        <span className="table-cell table-cell--categories" role="cell" data-label="Kategoria">
                          {place.category_ids.length
                            ? place.category_ids
                                .map((categoryId) => categoryById.get(categoryId)?.label ?? categoryId)
                                .join(", ")
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
                            className="ui-button ui-button--secondary"
                            type="button"
                            disabled={place.status === "archived"}
                            onClick={() => onArchive(place)}
                          >
                            Archiwizuj
                          </button>
                          <button className="ui-button ui-button--danger" type="button" onClick={() => onDelete(place)}>
                            Usuń trwale
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Fragment>
            );
          })}
          {places.length === 0 ? <p className="ui-empty">Brak miejsc w bazie.</p> : null}
        </div>
      </div>
    </section>
  );
}
