import type { Guide, Place } from "../../api/client";
import { ErrorModal } from "../ui/ErrorModal";
import { GuideFormModal } from "./GuideFormModal";
import { GuidePlacePanel } from "./GuidePlacePanel";
import { SystemModal } from "./SystemModal";
import { filterGuidePlaceCandidates } from "./guidePlaceSelection";
import { useGuideActions } from "./useGuideActions";

type Props = {
  guides: Guide[];
  onChanged: () => Promise<void>;
  places: Place[];
};

export function GuideManager({ guides, places, onChanged }: Props) {
  const guideActions = useGuideActions({ guides, onChanged });
  const availablePlaces = places.filter((place) => place.status !== "archived");
  const candidatePlaces = filterGuidePlaceCandidates(
    availablePlaces,
    guideActions.guideDetail?.places ?? [],
    guideActions.placeQuery,
  );

  return (
    <section className="admin-section admin-section-single guide-manager">
      <div className="guide-toolbar">
        <div className="admin-summary-pills" aria-label="Status przewodników">
          <span className="admin-summary-pill">Wszystkie {guides.length}</span>
          <span className="admin-summary-pill">Opublikowane {guideActions.guideStatusCounts.published}</span>
          <span className="admin-summary-pill">Szkice {guideActions.guideStatusCounts.draft}</span>
          <span className="admin-summary-pill">Archiwalne {guideActions.guideStatusCounts.archived}</span>
        </div>
        <button type="button" onClick={guideActions.openCreateGuideModal}>
          Dodaj przewodnik
        </button>
      </div>

      <div className="guide-list">
        {guides.map((guide) => {
          const isExpanded = guideActions.selectedGuideId === guide.id;
          return (
            <article className={isExpanded ? "guide-row is-expanded" : "guide-row"} key={guide.id}>
              <div className="guide-row-summary">
                <div className="guide-row-copy">
                  <strong className="guide-row-title">{guide.title}</strong>
                  <span className="guide-row-slug">{guide.slug}</span>
                </div>
                <span className={`guide-row-status status-badge status-badge--${guide.status}`}>{guide.status}</span>
                <div className="guide-actions">
                  <button className="secondary-button" type="button" onClick={() => guideActions.toggleGuide(guide.id)}>
                    {isExpanded ? "Zwiń miejsca" : "Miejsca"}
                  </button>
                  <button type="button" onClick={() => guideActions.openEditGuideModal(guide)}>
                    Edytuj
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => guideActions.requestDeleteGuide(guide)}
                  >
                    Usuń trwale
                  </button>
                </div>
              </div>
              {isExpanded ? (
                <GuidePlacePanel
                  availablePlaces={availablePlaces}
                  candidatePlaces={candidatePlaces}
                  guideDetail={guideActions.guideDetail}
                  isLoading={guideActions.isGuideDetailLoading}
                  placeQuery={guideActions.placeQuery}
                  selectedPlaceIds={guideActions.selectedPlaceIds}
                  selectedGuide={guideActions.selectedGuide}
                  onAddPlaces={guideActions.addPlaces}
                  onMovePlace={guideActions.movePlace}
                  onRemovePlace={guideActions.removePlace}
                  onPlaceQueryChange={guideActions.setPlaceQuery}
                  onTogglePlaceSelection={guideActions.toggleSelectedPlace}
                />
              ) : null}
            </article>
          );
        })}
        {guides.length === 0 ? (
          <p className="notice">Brak przewodników. Dodaj pierwszy przewodnik przyciskiem powyżej.</p>
        ) : null}
      </div>

      {guideActions.isGuideModalOpen ? (
        <GuideFormModal
          description={guideActions.description}
          editingGuide={guideActions.editingGuide}
          generatedSlug={guideActions.generatedSlug}
          isSaving={guideActions.isGuideSaving}
          status={guideActions.status}
          title={guideActions.title}
          onClose={guideActions.closeGuideModal}
          onConfirm={guideActions.saveGuide}
          onDescriptionChange={guideActions.setDescription}
          onStatusChange={guideActions.setStatus}
          onTitleChange={guideActions.setTitle}
        />
      ) : null}
      {guideActions.guideToDelete ? (
        <SystemModal
          confirmLabel="Usuń trwale"
          isBusy={guideActions.isDeletingGuide}
          message={`Przewodnik "${guideActions.guideToDelete.title}" zostanie trwale usunięty razem z przypięciami miejsc i zgłoszeniami dotyczącymi tego przewodnika. Same miejsca zostaną w bazie.`}
          title="Usunąć przewodnik?"
          tone="danger"
          onClose={guideActions.clearDeleteGuideRequest}
          onConfirm={guideActions.confirmDeleteGuide}
        />
      ) : null}
      {guideActions.operationError ? (
        <ErrorModal {...guideActions.operationError} onClose={() => guideActions.setOperationError(null)} />
      ) : null}
    </section>
  );
}
