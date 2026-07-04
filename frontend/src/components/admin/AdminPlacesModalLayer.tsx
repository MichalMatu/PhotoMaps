import { useEffect, useState } from "react";

import { getAdminPlacePhotos } from "../../api/media";
import type { AdminPhoto, AdminPlace, AppConfig, Category, City, PlaceMapItem } from "../../api/types";
import { ErrorModal, errorDetails, type OperationError } from "../ui/ErrorModal";
import { AdminCategoryManagerModal } from "./AdminCategoryManagerModal";
import { AdminCityManagementModals } from "./AdminCityManagementModals";
import { AdminPlaceActionModals } from "./AdminPlaceActionModals";
import { AdminPlaceFormModal } from "./AdminPlaceFormModal";
import { AdminPlacePhotoPreviewModal } from "./AdminPlacePhotoPreviewModal";
import { AdminPlacePublicPreviewModal } from "./AdminPlacePublicPreviewModal";
import type { CityActions } from "./useCityActions";
import type { AdminPlaceManagement, PlaceFormPayload } from "./useAdminPlaceManagement";

type Props = {
  appConfig: AppConfig | null;
  categories: Category[];
  cities: City[];
  cityActions: CityActions;
  isCategoryManagerOpen: boolean;
  loadError: OperationError | null;
  onCategoryManagerClose: () => void;
  onCategoryManagerOpen: () => void;
  onClearLoadError: () => void;
  onPhotoPreviewPlaceIdChange: (placeId: string | null) => void;
  onPublicPreviewPlaceIdChange: (placeId: string | null) => void;
  onRefreshCategories: () => Promise<void>;
  onRefreshPhotosAndPlaces: () => Promise<void>;
  photoPreviewPlaceId: string | null;
  placeManagement: AdminPlaceManagement;
  mapPlaces: PlaceMapItem[];
  places: AdminPlace[];
  publicPreviewPlaceId: string | null;
};

export function AdminPlacesModalLayer({
  appConfig,
  categories,
  cities,
  cityActions,
  isCategoryManagerOpen,
  loadError,
  onCategoryManagerClose,
  onCategoryManagerOpen,
  onClearLoadError,
  onPhotoPreviewPlaceIdChange,
  onPublicPreviewPlaceIdChange,
  onRefreshCategories,
  onRefreshPhotosAndPlaces,
  photoPreviewPlaceId,
  placeManagement,
  mapPlaces,
  places,
  publicPreviewPlaceId,
}: Props) {
  const [isPhotoPreviewLoading, setIsPhotoPreviewLoading] = useState(false);
  const [photoPreviewError, setPhotoPreviewError] = useState<OperationError | null>(null);
  const [photoPreviewPhotos, setPhotoPreviewPhotos] = useState<AdminPhoto[]>([]);
  const editingPlace = placeManagement.editingPlace;
  const editingPlaceView = editingPlace ? (places.find((place) => place.id === editingPlace.id) ?? editingPlace) : null;
  const editingPlacePhotoCount = editingPlaceView?.photo_count ?? 0;
  const photoPreviewPlace = photoPreviewPlaceId
    ? (places.find((place) => place.id === photoPreviewPlaceId) ??
      (editingPlace?.id === photoPreviewPlaceId ? editingPlace : null))
    : null;
  const publicPreviewPlace = publicPreviewPlaceId
    ? (mapPlaces.find((place) => place.id === publicPreviewPlaceId) ?? null)
    : null;

  async function refreshPhotoPreviewPhotos(placeId: string) {
    setIsPhotoPreviewLoading(true);
    setPhotoPreviewError(null);
    try {
      setPhotoPreviewPhotos(await getAdminPlacePhotos(placeId));
    } catch (reason) {
      setPhotoPreviewPhotos([]);
      setPhotoPreviewError({
        details: errorDetails(reason),
        message: "Nie udało się pobrać zdjęć tego miejsca.",
        title: "Nie udało się pobrać zdjęć",
      });
    } finally {
      setIsPhotoPreviewLoading(false);
    }
  }

  useEffect(() => {
    if (!photoPreviewPlaceId) {
      setPhotoPreviewPhotos([]);
      setPhotoPreviewError(null);
      setIsPhotoPreviewLoading(false);
      return;
    }

    let ignore = false;
    setIsPhotoPreviewLoading(true);
    setPhotoPreviewError(null);
    getAdminPlacePhotos(photoPreviewPlaceId)
      .then((nextPhotos) => {
        if (!ignore) {
          setPhotoPreviewPhotos(nextPhotos);
        }
      })
      .catch((reason: unknown) => {
        if (!ignore) {
          setPhotoPreviewPhotos([]);
          setPhotoPreviewError({
            details: errorDetails(reason),
            message: "Nie udało się pobrać zdjęć tego miejsca.",
            title: "Nie udało się pobrać zdjęć",
          });
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsPhotoPreviewLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [photoPreviewPlaceId]);

  function closePlaceEditor() {
    onPhotoPreviewPlaceIdChange(null);
    onPublicPreviewPlaceIdChange(null);
    placeManagement.closePlaceModal();
  }

  async function handleSubmitPlace(payload: PlaceFormPayload) {
    await placeManagement.submitPlace(payload);
    onPhotoPreviewPlaceIdChange(null);
    onPublicPreviewPlaceIdChange(null);
  }

  function openPhotoPreview(place: { id: string }) {
    onPhotoPreviewPlaceIdChange(place.id);
  }

  async function handlePhotoPreviewChanged() {
    await onRefreshPhotosAndPlaces();
    if (photoPreviewPlaceId) {
      await refreshPhotoPreviewPhotos(photoPreviewPlaceId);
    }
  }

  return (
    <>
      {placeManagement.isPlaceModalOpen && appConfig ? (
        <AdminPlaceFormModal
          appConfig={appConfig}
          categories={categories}
          cities={cities}
          editingPlace={editingPlace}
          editingPlacePhotoCount={editingPlacePhotoCount}
          editingPlaceView={editingPlaceView}
          onClose={closePlaceEditor}
          onManageCategories={onCategoryManagerOpen}
          onOpenPhotoPreview={openPhotoPreview}
          onSubmit={handleSubmitPlace}
        />
      ) : null}

      {isCategoryManagerOpen ? (
        <AdminCategoryManagerModal
          categories={categories}
          places={places}
          onChanged={onRefreshCategories}
          onClose={onCategoryManagerClose}
        />
      ) : null}

      <AdminCityManagementModals appConfig={appConfig} cityActions={cityActions} />

      {photoPreviewPlace ? (
        <AdminPlacePhotoPreviewModal
          cities={cities}
          isLoading={isPhotoPreviewLoading}
          photos={photoPreviewPhotos}
          place={photoPreviewPlace}
          onChanged={handlePhotoPreviewChanged}
          onClose={() => onPhotoPreviewPlaceIdChange(null)}
        />
      ) : null}

      {appConfig && publicPreviewPlace ? (
        <AdminPlacePublicPreviewModal
          customFieldDefinitions={appConfig.place_custom_fields}
          place={publicPreviewPlace}
          onClose={() => onPublicPreviewPlaceIdChange(null)}
        />
      ) : null}

      <AdminPlaceActionModals placeManagement={placeManagement} />

      {loadError ? <ErrorModal {...loadError} onClose={onClearLoadError} /> : null}
      {photoPreviewError ? <ErrorModal {...photoPreviewError} onClose={() => setPhotoPreviewError(null)} /> : null}
    </>
  );
}
