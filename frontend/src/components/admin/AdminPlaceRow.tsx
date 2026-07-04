import { Archive, Eye, Images, Pencil, Trash2 } from "lucide-react";

import type { AdminPlace, Category } from "../../api/types";
import { AdminActionIconButton } from "./AdminActionIconButton";
import { getPlaceCompleteness } from "./placeCompleteness";

type Props = {
  categoryById: Map<string, Category>;
  editingPlaceId: string | null;
  onArchive: (place: AdminPlace) => void;
  onDelete: (place: AdminPlace) => void;
  onEdit: (place: AdminPlace) => void;
  onPhotos: (place: AdminPlace) => void;
  onPublicPreview: (place: AdminPlace) => void;
  place: AdminPlace;
  publicPreviewAvailable: boolean;
};

export function AdminPlaceRow({
  categoryById,
  editingPlaceId,
  onArchive,
  onDelete,
  onEdit,
  onPhotos,
  onPublicPreview,
  place,
  publicPreviewAvailable,
}: Props) {
  const completeness = getPlaceCompleteness(place);
  const completenessText = `${completeness.passedCount}/${completeness.totalCount}`;
  const completenessDetails = completeness.isReady ? "Komplet" : `Brak: ${completeness.missingLabels.join(", ")}`;

  return (
    <div className={editingPlaceId === place.id ? "table-row is-selected" : "table-row"}>
      <span className="table-cell table-cell--title" data-label="Nazwa">
        {place.title}
      </span>
      <span className="table-cell table-cell--categories" data-label="Kategoria">
        {place.category_ids.length
          ? place.category_ids.map((categoryId) => categoryById.get(categoryId)?.label ?? categoryId).join(", ")
          : "-"}
      </span>
      <span className="table-cell table-cell--priority" data-label="Priorytet">
        {place.weight.toFixed(1)}
      </span>
      <span className="table-cell table-cell--completeness" data-label="Kompletność">
        <span
          className={completeness.isReady ? "place-completeness is-ready" : "place-completeness"}
          title={completenessDetails}
        >
          {completenessText}
        </span>
      </span>
      <div className="table-cell table-cell--actions table-actions">
        <AdminActionIconButton
          disabled={!publicPreviewAvailable}
          icon={Eye}
          label={
            publicPreviewAvailable
              ? `Podgląd publiczny miejsca ${place.title}`
              : `Brak publicznego podglądu miejsca ${place.title}`
          }
          onClick={() => onPublicPreview(place)}
        />
        <AdminActionIconButton
          icon={Images}
          label={`Galeria zdjęć miejsca ${place.title}`}
          onClick={() => onPhotos(place)}
        />
        <AdminActionIconButton
          icon={Pencil}
          label={`Edytuj miejsce ${place.title}`}
          tone="primary"
          onClick={() => onEdit(place)}
        />
        <AdminActionIconButton
          disabled={place.status === "archived"}
          icon={Archive}
          label={`Archiwizuj miejsce ${place.title}`}
          tone="secondary"
          onClick={() => onArchive(place)}
        />
        <AdminActionIconButton
          icon={Trash2}
          label={`Usuń miejsce ${place.title}`}
          tone="danger"
          onClick={() => onDelete(place)}
        />
      </div>
    </div>
  );
}
