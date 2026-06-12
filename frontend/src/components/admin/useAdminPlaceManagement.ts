import { useEffect, useState } from "react";

import { archivePlace, createPlace, deletePlacePermanently, updatePlace, type PlacePayload } from "../../api/client";
import type { Place } from "../../api/types";
import { errorDetails, type OperationError } from "../ui/ErrorModal";
import { uploadAndApproveAdminPlacePhoto } from "./adminPhotoUpload";

type Options = {
  isSessionActive: boolean;
  onPhotosChanged?: () => Promise<void>;
  onPlacesChanged: () => Promise<void>;
};

export type PlaceFormPayload = PlacePayload & {
  coverPhotoCaption: string;
  coverPhotoFile: File | null;
};

type Result = {
  clearArchiveRequest: () => void;
  clearDeleteRequest: () => void;
  clearOperationError: () => void;
  closePlaceModal: () => void;
  confirmArchivePlace: () => Promise<void>;
  confirmDeletePlace: () => Promise<void>;
  editingPlace: Place | null;
  isArchiving: boolean;
  isDeleting: boolean;
  isPlaceModalOpen: boolean;
  openCreatePlaceModal: () => void;
  openEditPlaceModal: (place: Place) => void;
  operationError: OperationError | null;
  placeToArchive: Place | null;
  placeToDelete: Place | null;
  requestArchivePlace: (place: Place) => void;
  requestDeletePlace: (place: Place) => void;
  submitPlace: (payload: PlaceFormPayload) => Promise<void>;
};

export function getClosedPlaceManagementState() {
  return {
    editingPlace: null,
    isPlaceModalOpen: false,
    placeToArchive: null,
    placeToDelete: null,
  };
}

export function getCreatePlaceModalState() {
  return {
    editingPlace: null,
    isPlaceModalOpen: true,
  };
}

export function getEditPlaceModalState(place: Place) {
  return {
    editingPlace: place,
    isPlaceModalOpen: true,
  };
}

export function placePayloadFromFormPayload(payload: PlaceFormPayload): PlacePayload {
  return {
    category_ids: payload.category_ids,
    city_id: payload.city_id,
    description: payload.description,
    lat: payload.lat,
    local_comment: payload.local_comment,
    lon: payload.lon,
    slug: payload.slug,
    status: payload.status,
    title: payload.title,
    weight: payload.weight,
  };
}

export function useAdminPlaceManagement({ isSessionActive, onPhotosChanged, onPlacesChanged }: Options): Result {
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [placeToArchive, setPlaceToArchive] = useState<Place | null>(null);
  const [placeToDelete, setPlaceToDelete] = useState<Place | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);

  useEffect(() => {
    if (!isSessionActive) {
      setEditingPlace(null);
      setIsPlaceModalOpen(false);
      setPlaceToArchive(null);
      setPlaceToDelete(null);
      setIsArchiving(false);
      setIsDeleting(false);
      setOperationError(null);
    }
  }, [isSessionActive]);

  function openCreatePlaceModal() {
    const nextState = getCreatePlaceModalState();
    setEditingPlace(nextState.editingPlace);
    setIsPlaceModalOpen(nextState.isPlaceModalOpen);
  }

  function openEditPlaceModal(place: Place) {
    const nextState = getEditPlaceModalState(place);
    setEditingPlace(nextState.editingPlace);
    setIsPlaceModalOpen(nextState.isPlaceModalOpen);
  }

  function closePlaceModal() {
    const nextState = getClosedPlaceManagementState();
    setEditingPlace(nextState.editingPlace);
    setIsPlaceModalOpen(nextState.isPlaceModalOpen);
  }

  async function refreshAfterPlaceSubmit(hasPhoto: boolean) {
    if (hasPhoto && onPhotosChanged) {
      await onPhotosChanged();
      return;
    }
    await onPlacesChanged();
  }

  async function submitPlace(payload: PlaceFormPayload) {
    setOperationError(null);
    try {
      if (editingPlace) {
        await updatePlace(editingPlace.id, placePayloadFromFormPayload(payload));
      } else {
        const createdPlace = await createPlace(placePayloadFromFormPayload(payload));
        if (payload.coverPhotoFile) {
          try {
            await uploadAndApproveAdminPlacePhoto(createdPlace.id, payload.coverPhotoFile, payload.coverPhotoCaption);
          } catch (reason) {
            closePlaceModal();
            await refreshAfterPlaceSubmit(true);
            setOperationError({
              details: errorDetails(reason),
              message: "Miejsce zostało dodane, ale nie udało się dodać zdjęcia głównego.",
              title: "Miejsce zapisane bez zdjęcia",
            });
            return;
          }
        }
      }
      closePlaceModal();
      await refreshAfterPlaceSubmit(Boolean(payload.coverPhotoFile));
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zapisać miejsca. Sprawdź dane i spróbuj ponownie.",
        title: "Nie udało się zapisać miejsca",
      });
    }
  }

  async function confirmArchivePlace() {
    if (!placeToArchive) {
      return;
    }

    setOperationError(null);
    setIsArchiving(true);
    try {
      await archivePlace(placeToArchive.id);
      if (editingPlace?.id === placeToArchive.id) {
        setEditingPlace(null);
      }
      setPlaceToArchive(null);
      await onPlacesChanged();
    } catch (reason) {
      setPlaceToArchive(null);
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zarchiwizować miejsca. Spróbuj ponownie.",
        title: "Nie udało się zarchiwizować miejsca",
      });
    } finally {
      setIsArchiving(false);
    }
  }

  async function confirmDeletePlace() {
    if (!placeToDelete) {
      return;
    }

    setOperationError(null);
    setIsDeleting(true);
    try {
      await deletePlacePermanently(placeToDelete.id);
      if (editingPlace?.id === placeToDelete.id) {
        setEditingPlace(null);
        setIsPlaceModalOpen(false);
      }
      setPlaceToDelete(null);
      await onPlacesChanged();
    } catch (reason) {
      setPlaceToDelete(null);
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się trwale usunąć miejsca. Spróbuj ponownie.",
        title: "Nie udało się usunąć miejsca",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    clearArchiveRequest: () => setPlaceToArchive(null),
    clearDeleteRequest: () => setPlaceToDelete(null),
    clearOperationError: () => setOperationError(null),
    closePlaceModal,
    confirmArchivePlace,
    confirmDeletePlace,
    editingPlace,
    isArchiving,
    isDeleting,
    isPlaceModalOpen,
    openCreatePlaceModal,
    openEditPlaceModal,
    operationError,
    placeToArchive,
    placeToDelete,
    requestArchivePlace: setPlaceToArchive,
    requestDeletePlace: setPlaceToDelete,
    submitPlace,
  };
}
