import { Archive, Pencil, Trash2 } from "lucide-react";

import type { AdminPlace, Category, City } from "../../api/types";
import { AdminActionIconButton } from "./AdminActionIconButton";
import { AdminDisclosureRow } from "./AdminDisclosureRow";
import type { PlaceCityGroup } from "./adminPlaceCityGroups";
import { AdminPlaceRow } from "./AdminPlaceRow";
import { polishCountLabel } from "../ui/polishCountLabel";
import { adminCityStatusLabel } from "./adminStatusUi";

type Props = {
  categoryById: Map<string, Category>;
  editingPlaceId: string | null;
  group: PlaceCityGroup;
  isExpanded: boolean;
  onArchiveCity: (city: City) => void;
  onArchivePlace: (place: AdminPlace) => void;
  onDeleteCity: (city: City) => void;
  onDeletePlace: (place: AdminPlace) => void;
  onEditCity: (city: City) => void;
  onEditPlace: (place: AdminPlace) => void;
  onPhotos: (place: AdminPlace) => void;
  onPublicPreviewPlace: (place: AdminPlace) => void;
  onToggle: (cityId: string) => void;
  publicPreviewPlaceIds: Set<string>;
};

function placeCountLabel(count: number) {
  return polishCountLabel(count, {
    few: "miejsca",
    many: "miejsc",
    one: "miejsce",
  });
}

export function AdminPlaceCityGroup({
  categoryById,
  editingPlaceId,
  group,
  isExpanded,
  onArchiveCity,
  onArchivePlace,
  onDeleteCity,
  onDeletePlace,
  onEditCity,
  onEditPlace,
  onPhotos,
  onPublicPreviewPlace,
  onToggle,
  publicPreviewPlaceIds,
}: Props) {
  const city = group.city;
  const cityGroupPlacesId = `place-city-group-${group.cityId}`;

  return (
    <AdminDisclosureRow
      actions={
        city ? (
          <>
            <AdminActionIconButton
              icon={Pencil}
              label={`Edytuj miasto ${city.name}`}
              onClick={() => onEditCity(city)}
            />
            <AdminActionIconButton
              disabled={city.status === "archived"}
              icon={Archive}
              label={`Archiwizuj miasto ${city.name}`}
              tone="secondary"
              onClick={() => onArchiveCity(city)}
            />
            <AdminActionIconButton
              icon={Trash2}
              label={`Usuń miasto ${city.name}`}
              tone="danger"
              onClick={() => onDeleteCity(city)}
            />
          </>
        ) : null
      }
      actionsClassName="admin-list-group-actions place-city-actions"
      className="admin-list-group place-city-disclosure"
      collapseLabel={`Zwiń miejsca miasta ${group.cityName}`}
      expandLabel={`Pokaż miejsca miasta ${group.cityName}`}
      headerClassName="admin-list-group-row place-city-row"
      isExpanded={isExpanded}
      meta={
        <>
          {city ? (
            <span className={`ui-status ui-status--${city.status}`}>{adminCityStatusLabel(city.status)}</span>
          ) : null}
          {city ? <span className="admin-list-group-meta-item">{city.region}</span> : null}
          {city ? (
            <span className="admin-list-group-meta-item place-city-meta-item--zoom">
              Startowy zoom: {city.default_zoom}
            </span>
          ) : null}
          {city ? (
            <span className="admin-list-group-meta-item place-city-meta-item--coordinates">
              {city.lat.toFixed(4)}, {city.lon.toFixed(4)}
            </span>
          ) : (
            <span className="admin-list-group-meta-item">Brak rekordu miasta</span>
          )}
        </>
      }
      metaClassName="admin-list-group-meta place-city-meta"
      panelClassName="admin-list-group-panel place-city-group"
      panelId={cityGroupPlacesId}
      summary={
        <>
          <span className="admin-list-group-title">{group.cityName}</span>
          <span className="admin-list-group-count place-city-count">{placeCountLabel(group.places.length)}</span>
        </>
      }
      summaryClassName="admin-list-group-label place-city-label"
      toggleClassName="admin-list-group-toggle place-city-toggle"
      onToggle={() => onToggle(group.cityId)}
    >
      {group.places.length === 0 ? (
        <p className="admin-list-empty place-city-empty">Brak miejsc w tym mieście.</p>
      ) : null}
      {group.places.map((place) => (
        <AdminPlaceRow
          categoryById={categoryById}
          editingPlaceId={editingPlaceId}
          key={place.id}
          place={place}
          onArchive={onArchivePlace}
          onDelete={onDeletePlace}
          onEdit={onEditPlace}
          onPhotos={onPhotos}
          onPublicPreview={onPublicPreviewPlace}
          publicPreviewAvailable={publicPreviewPlaceIds.has(place.id)}
        />
      ))}
    </AdminDisclosureRow>
  );
}
