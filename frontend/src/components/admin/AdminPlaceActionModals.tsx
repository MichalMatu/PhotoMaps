import { ErrorModal } from "../ui/ErrorModal";
import { SystemModal } from "./SystemModal";
import type { AdminPlaceManagement } from "./useAdminPlaceManagement";

type Props = {
  placeManagement: AdminPlaceManagement;
};

export function AdminPlaceActionModals({ placeManagement }: Props) {
  return (
    <>
      {placeManagement.placeToArchive ? (
        <SystemModal
          confirmLabel="Archiwizuj"
          isBusy={placeManagement.isArchiving}
          message={`Miejsce "${placeManagement.placeToArchive.title}" zniknie z publicznej mapy, ale zostanie w bazie jako archiwalne.`}
          title="Archiwizować miejsce?"
          tone="danger"
          onClose={placeManagement.clearArchiveRequest}
          onConfirm={placeManagement.confirmArchivePlace}
        />
      ) : null}

      {placeManagement.placeToDelete ? (
        <SystemModal
          confirmLabel="Usuń"
          isBusy={placeManagement.isDeleting}
          message={`Miejsce "${placeManagement.placeToDelete.title}" zostanie trwale usunięte razem ze zdjęciami, pamiątkami, przypisaniami do tras i zgłoszeniami. Tej operacji nie da się cofnąć.`}
          title="Usunąć miejsce trwale?"
          tone="danger"
          onClose={placeManagement.clearDeleteRequest}
          onConfirm={placeManagement.confirmDeletePlace}
        />
      ) : null}

      {placeManagement.operationError ? (
        <ErrorModal {...placeManagement.operationError} onClose={placeManagement.clearOperationError} />
      ) : null}
    </>
  );
}
