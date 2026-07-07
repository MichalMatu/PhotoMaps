import type { AppConfig } from "../../api/types";
import { ErrorModal } from "../ui/ErrorModal";
import { CityFormModal } from "./CityFormModal";
import { SystemModal } from "./SystemModal";
import type { CityActions } from "./useCityActions";

type Props = {
  appConfig: AppConfig | null;
  cityActions: CityActions;
};

export function AdminCityManagementModals({ appConfig, cityActions }: Props) {
  return (
    <>
      {cityActions.isCityModalOpen ? (
        <CityFormModal
          canSave={cityActions.canSave}
          cityId={cityActions.cityId}
          editingCity={cityActions.editingCity}
          isSaving={cityActions.isSaving}
          lat={cityActions.lat}
          lon={cityActions.lon}
          mapFallback={appConfig?.map ?? null}
          name={cityActions.name}
          region={cityActions.region}
          sortOrder={cityActions.sortOrder}
          status={cityActions.status}
          zoom={cityActions.zoom}
          onCityIdChange={cityActions.setId}
          onClose={cityActions.handleCloseCityModal}
          onConfirm={cityActions.handleSaveCity}
          onLatChange={cityActions.setLat}
          onLonChange={cityActions.setLon}
          onNameChange={cityActions.setName}
          onRegionChange={cityActions.setRegion}
          onSortOrderChange={cityActions.setSortOrder}
          onStatusChange={cityActions.setStatus}
          onZoomChange={cityActions.setZoom}
        />
      ) : null}

      {cityActions.cityAction ? (
        <SystemModal
          confirmLabel={cityActions.cityAction.type === "archive" ? "Archiwizuj" : "Usuń"}
          isBusy={cityActions.isProcessingAction}
          message={
            cityActions.cityAction.type === "archive"
              ? `Miasto "${cityActions.cityAction.city.name}" zniknie z publicznych list miast, ale zostanie w bazie.`
              : cityActions.cityBlockers.length > 0
                ? `Miasto "${cityActions.cityAction.city.name}" ma przypięte ${cityActions.cityBlockers.length} miejsc. Trwałe usunięcie będzie zablokowane, dopóki nie przeniesiesz ich do innego miasta.`
                : `Miasto "${cityActions.cityAction.city.name}" zostanie fizycznie usunięte.`
          }
          details={cityActions.cityAction.type === "delete" ? cityActions.cityBlockerDetails : null}
          title={cityActions.cityAction.type === "archive" ? "Archiwizować miasto?" : "Usunąć miasto trwale?"}
          tone="danger"
          onClose={() => cityActions.setCityAction(null)}
          onConfirm={cityActions.handleConfirmCityAction}
        />
      ) : null}

      {cityActions.operationError ? (
        <ErrorModal {...cityActions.operationError} onClose={() => cityActions.setOperationError(null)} />
      ) : null}
    </>
  );
}
