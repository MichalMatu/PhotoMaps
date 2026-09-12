import { useCallback, useEffect, useRef, useState } from "react";

import { getAdminPlacePhotos } from "../../api/media";
import type { AdminPhoto, AdminPlace, AppConfig, Category, City, PlaceMapItem } from "../../api/types";
import { ErrorModal, errorDetails, type OperationError } from "../ui/ErrorModal";
import { AdminCategoryManagerModal } from "./AdminCategoryManagerModal";
import { AdminCityManagementModals } from "./AdminCityManagementModals";
import { AdminPlaceActionModals } from "./AdminPlaceActionModals";
import { AdminPlaceFormModal } from "./AdminPlaceFormModal";
import { AdminPlacePhotoPreviewModal } from "./AdminPlacePhotoPreviewModal";
import { AdminPlacePublicPreviewModal } from "./AdminPlacePublicPreviewModal";
import { createLatestRequestGuard, type LatestRequestGuard } from "./latestRequestGuard";
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
  const photoPreviewRequestGuard = useRef<LatestRequestGuard>(createLatestRequestGuard());
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

  const refreshPhotoPreviewPhotos = useCallback(async (placeId: string) => {
    const guard = photoPreviewRequestGuard.current;
    const token = guard.begin();
    setIsPhotoPreviewLoading(true);
    setPhotoPreviewError(null);
    try {
      const nextPhotos = await getAdminPlacePhotos(placeId);
      if (guard.isCurrent(token)) {
        setPhotoPreviewPhotos(nextPhotos);
      }
    } catch (reason) {
      if (guard.isCurrent(token)) {
        setPhotoPreviewPhotos([]);
        setPhotoPreviewError({
          details: errorDetails(reason),
          message: "Nie udało się pobrać zdjęć tego miejsca.",
          title: "Nie udało się pobrać zdjęć",
        });
      }
    } finally {
      if (guard.isCurrent(token)) {
        setIsPhotoPreviewLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const guard = photoPreviewRequestGuard.current;
    if (!photoPreviewPlaceId) {
      guard.invalidate();
      setPhotoPreviewPhotos([]);
      setPhotoPreviewError(null);
      setIsPhotoPreviewLoading(false);
      return;
    }

    void refreshPhotoPreviewPhotos(photoPreviewPlaceId);

    return () => {
      guard.invalidate();
    };
  }, [photoPreviewPlaceId, refreshPhotoPreviewPhotos]);

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
    if (!photoPreviewPlaceId) {
      return;
    }

    const guard = photoPreviewRequestGuard.current;
    const token = guard.begin();
    const placeId = photoPreviewPlaceId;
    await onRefreshPhotosAndPlaces();
    if (guard.isCurrent(token)) {
      await refreshPhotoPreviewPhotos(placeId);
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
          onLocationAutoSave={
            editingPlace ? (location) => placeManagement.savePlaceLocation(editingPlace, location) : undefined
          }
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
