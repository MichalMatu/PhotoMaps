import { useMemo, useState } from "react";

import type { AdminPlace, Category, City, PlaceMapItem } from "../../api/types";
import { getPlacePreviewVisual } from "../map/placePreview";
import { AdminPlaceFilterModal } from "./AdminPlaceFilterModal";
import {
  DEFAULT_ADMIN_PLACE_FILTERS,
  countActiveAdminPlaceModalFilters,
  filterAdminPlaces,
  type AdminPlaceFilters,
} from "./adminPlaceFilters";
import { getPlaceCityGroups } from "./adminPlaceCityGroups";
import { AdminListPanel } from "./AdminListPanel";
import { AdminPlaceCityGroup } from "./AdminPlaceCityGroup";
import { AdminPlacesToolbar } from "./AdminPlacesToolbar";

type Props = {
  categories: Category[];
  cities: City[];
  editingPlaceId: string | null;
  mapPlaces: PlaceMapItem[];
  onArchive: (place: AdminPlace) => void;
  onArchiveCity: (city: City) => void;
  onCreate: () => void;
  onCreateCity: () => void;
  onDelete: (place: AdminPlace) => void;
  onDeleteCity: (city: City) => void;
  onEditCity: (city: City) => void;
  onEdit: (place: AdminPlace) => void;
  onManageCategories: () => void;
  onPhotos: (place: AdminPlace) => void;
  onPublicPreview: (place: AdminPlace) => void;
  places: AdminPlace[];
};

export function AdminPlacesSection({
  categories,
  cities,
  editingPlaceId,
  mapPlaces,
  onArchive,
  onArchiveCity,
  onCreate,
  onCreateCity,
  onDelete,
  onDeleteCity,
  onEdit,
  onEditCity,
  onManageCategories,
  onPhotos,
  onPublicPreview,
  places,
}: Props) {
  const [expandedCityIds, setExpandedCityIds] = useState<Set<string>>(() => new Set());
  const [filters, setFilters] = useState<AdminPlaceFilters>(DEFAULT_ADMIN_PLACE_FILTERS);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const publicPreviewPlaceIds = useMemo(
    () =>
      new Set(
        mapPlaces.flatMap((place) => {
          return getPlacePreviewVisual(place) ? [place.id] : [];
        }),
      ),
    [mapPlaces],
  );
  const visiblePlaces = useMemo(() => filterAdminPlaces(places, filters), [filters, places]);
  const activeFilterCount = countActiveAdminPlaceModalFilters(filters);
  const placeCityGroups = useMemo(() => getPlaceCityGroups(cities, visiblePlaces), [cities, visiblePlaces]);

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
      <AdminPlacesToolbar
        activeFilterCount={activeFilterCount}
        activeStatusFilter={filters.status}
        places={places}
        visiblePlaceCount={visiblePlaces.length}
        onCreateCity={onCreateCity}
        onCreatePlace={onCreate}
        onManageCategories={onManageCategories}
        onOpenFilters={() => setIsFilterModalOpen(true)}
        onStatusFilterChange={(status) => setFilters((currentFilters) => ({ ...currentFilters, status }))}
      />

      <div className="admin-list">
        <AdminListPanel className="place-table" mode="responsive-cards">
          {visiblePlaces.length > 0
            ? placeCityGroups.map((cityGroup) => (
                <AdminPlaceCityGroup
                  categoryById={categoryById}
                  editingPlaceId={editingPlaceId}
                  group={cityGroup}
                  isExpanded={expandedCityIds.has(cityGroup.cityId)}
                  key={cityGroup.cityId}
                  onArchiveCity={onArchiveCity}
                  onArchivePlace={onArchive}
                  onDeleteCity={onDeleteCity}
                  onDeletePlace={onDelete}
                  onEditCity={onEditCity}
                  onEditPlace={onEdit}
                  onPhotos={onPhotos}
                  onPublicPreviewPlace={onPublicPreview}
                  onToggle={toggleCity}
                  publicPreviewPlaceIds={publicPreviewPlaceIds}
                />
              ))
            : null}
          {places.length === 0 ? <p className="ui-empty">Brak miejsc w bazie.</p> : null}
          {places.length > 0 && visiblePlaces.length === 0 ? (
            <p className="ui-empty">Brak miejsc dla wybranych filtrów.</p>
          ) : null}
        </AdminListPanel>
      </div>
      {isFilterModalOpen ? (
        <AdminPlaceFilterModal
          categories={categories}
          cities={cities}
          filters={filters}
          onChange={setFilters}
          onClose={() => setIsFilterModalOpen(false)}
        />
      ) : null}
    </section>
  );
}
