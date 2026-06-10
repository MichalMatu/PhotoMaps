import { useEffect, useState } from "react";

import { archivePlace, createPlace, updatePlace, type PlacePayload } from "../../api/client";
import type { Place } from "../../api/types";
import { errorDetails, type OperationError } from "../ui/ErrorModal";

type Options = {
  isSessionActive: boolean;
  onPlacesChanged: () => Promise<void>;
};

type Result = {
  clearArchiveRequest: () => void;
  clearOperationError: () => void;
  closePlaceModal: () => void;
  confirmArchivePlace: () => Promise<void>;
  editingPlace: Place | null;
  isArchiving: boolean;
  isPlaceModalOpen: boolean;
  openCreatePlaceModal: () => void;
  openEditPlaceModal: (place: Place) => void;
  operationError: OperationError | null;
  placeToArchive: Place | null;
  requestArchivePlace: (place: Place) => void;
  submitPlace: (payload: PlacePayload) => Promise<void>;
};

export function getClosedPlaceManagementState() {
  return {
    editingPlace: null,
    isPlaceModalOpen: false,
    placeToArchive: null,
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

export function useAdminPlaceManagement({ isSessionActive, onPlacesChanged }: Options): Result {
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [placeToArchive, setPlaceToArchive] = useState<Place | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);

  useEffect(() => {
    if (!isSessionActive) {
      setEditingPlace(null);
      setIsPlaceModalOpen(false);
      setPlaceToArchive(null);
      setIsArchiving(false);
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

  async function submitPlace(payload: PlacePayload) {
    setOperationError(null);
    try {
      if (editingPlace) {
        await updatePlace(editingPlace.id, payload);
      } else {
        await createPlace(payload);
      }
      closePlaceModal();
      await onPlacesChanged();
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

  return {
    clearArchiveRequest: () => setPlaceToArchive(null),
    clearOperationError: () => setOperationError(null),
    closePlaceModal,
    confirmArchivePlace,
    editingPlace,
    isArchiving,
    isPlaceModalOpen,
    openCreatePlaceModal,
    openEditPlaceModal,
    operationError,
    placeToArchive,
    requestArchivePlace: setPlaceToArchive,
    submitPlace,
  };
}
