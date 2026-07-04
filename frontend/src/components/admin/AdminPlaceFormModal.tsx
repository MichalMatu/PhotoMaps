import type { AdminPlace, AppConfig, Category, City } from "../../api/types";
import { polishCountLabel } from "../ui/polishCountLabel";
import { PlaceForm } from "./PlaceForm";
import { SystemModal } from "./SystemModal";
import type { PlaceFormPayload } from "./useAdminPlaceManagement";

type Props = {
  appConfig: AppConfig;
  categories: Category[];
  cities: City[];
  editingPlace: AdminPlace | null;
  editingPlacePhotoCount: number;
  editingPlaceView: AdminPlace | null;
  onClose: () => void;
  onManageCategories: () => void;
  onOpenPhotoPreview: (place: AdminPlace) => void;
  onSubmit: (payload: PlaceFormPayload) => Promise<void>;
};

function photoCountLabel(count: number) {
  return polishCountLabel(count, {
    few: "zdjęcia",
    many: "zdjęć",
    one: "zdjęcie",
  });
}

export function AdminPlaceFormModal({
  appConfig,
  categories,
  cities,
  editingPlace,
  editingPlacePhotoCount,
  editingPlaceView,
  onClose,
  onManageCategories,
  onOpenPhotoPreview,
  onSubmit,
}: Props) {
  return (
    <SystemModal
      eyebrow="Miejsca"
      showActions={false}
      size="wide"
      title={editingPlace ? "Edytuj miejsce" : "Dodaj miejsce"}
      onClose={onClose}
    >
      <PlaceForm
        categories={categories}
        cities={cities}
        className="ui-form admin-form place-form place-form--modal"
        mapFallback={appConfig.map}
        place={editingPlace}
        placeCustomFieldDefinitions={appConfig.place_custom_fields}
        secondaryAction={
          editingPlaceView
            ? {
                detail: photoCountLabel(editingPlacePhotoCount),
                label: "Dodaj zdjęcia",
                onClick: () => onOpenPhotoPreview(editingPlaceView),
              }
            : undefined
        }
        onCancel={onClose}
        onManageCategories={onManageCategories}
        onSubmit={onSubmit}
      />
    </SystemModal>
  );
}
