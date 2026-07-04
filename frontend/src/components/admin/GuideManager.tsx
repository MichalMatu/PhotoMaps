import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { City, Guide, Place } from "../../api/types";
import { AdminActionIconButton } from "./AdminActionIconButton";
import { AdminDisclosureRow } from "./AdminDisclosureRow";
import { AdminStatusFilterTabs } from "./AdminStatusFilterTabs";
import { AdminToolbar } from "./AdminToolbar";
import { ErrorModal } from "../ui/ErrorModal";
import { adminGuideStatusLabel } from "./adminStatusUi";
import { GuideFormModal } from "./GuideFormModal";
import { GuidePlacePanel } from "./GuidePlacePanel";
import { SystemModal } from "./SystemModal";
import { filterGuidesByStatus, type GuideStatusFilter } from "./guideActionsState";
import { filterSelectableGuidePlaces, firstGuideCityId } from "./guidePlaceSelection";
import { useGuideActions } from "./useGuideActions";

type Props = {
  cities: City[];
  guides: Guide[];
  onChanged: () => Promise<void>;
  places: Place[];
};

export function GuideManager({ cities, guides, places, onChanged }: Props) {
  const guideActions = useGuideActions({ guides, onChanged });
  const [statusFilter, setStatusFilter] = useState<GuideStatusFilter>("all");
  const visibleGuides = useMemo(() => filterGuidesByStatus(guides, statusFilter), [guides, statusFilter]);
  const availablePlaces = places.filter((place) => place.status === "published");
  const selectedGuideCityId = guideActions.selectedCityId || firstGuideCityId(availablePlaces);
  const editingGuideRoutePlaces =
    guideActions.editingGuide && guideActions.guideDetail?.id === guideActions.editingGuide.id
      ? guideActions.guideDetail.places
      : [];
  const isEditingGuidePlacesLoading =
    Boolean(guideActions.editingGuide) &&
    guideActions.selectedGuideId === guideActions.editingGuide?.id &&
    guideActions.isGuideDetailLoading;
  const selectablePlaces = filterSelectableGuidePlaces(
    availablePlaces,
    guideActions.guideDetail?.places ?? [],
    selectedGuideCityId,
    guideActions.placeQuery,
  );

  return (
    <section className="admin-section admin-section-single guide-manager">
      <AdminToolbar
        primary={
          <AdminStatusFilterTabs
            activeStatus={statusFilter}
            ariaLabel="Status tras"
            options={[
              { count: guides.length, key: "all", label: "Wszystkie" },
              { count: guideActions.guideStatusCounts.published, key: "published", label: "Opublikowane" },
              { count: guideActions.guideStatusCounts.draft, key: "draft", label: "Szkice" },
              { count: guideActions.guideStatusCounts.archived, key: "archived", label: "Archiwalne" },
            ]}
            onChange={setStatusFilter}
          />
        }
        actions={{
          primary: (
            <AdminActionIconButton
              icon={Plus}
              label="Dodaj trasę"
              tone="primary"
              onClick={guideActions.openCreateGuideModal}
            />
          ),
        }}
      />

      <div className="guide-list">
        {visibleGuides.map((guide) => {
          const isExpanded = guideActions.selectedGuideId === guide.id;
          const panelId = `guide-place-panel-${guide.id}`;
          return (
            <AdminDisclosureRow
              actions={
                <>
                  <AdminActionIconButton
                    icon={Pencil}
                    label={`Edytuj trasę ${guide.title}`}
                    tone="primary"
                    onClick={() => guideActions.openEditGuideModal(guide)}
                  />
                  <AdminActionIconButton
                    icon={Trash2}
                    label={`Usuń trasę ${guide.title}`}
                    tone="danger"
                    onClick={() => guideActions.requestDeleteGuide(guide)}
                  />
                </>
              }
              actionsClassName="guide-actions"
              className="ui-panel guide-row"
              collapseLabel={`Zwiń miejsca trasy ${guide.title}`}
              element="article"
              expandLabel={`Pokaż miejsca trasy ${guide.title}`}
              headerClassName="guide-row-summary"
              isExpanded={isExpanded}
              key={guide.id}
              meta={adminGuideStatusLabel(guide.status)}
              metaClassName={`guide-row-status ui-status ui-status--${guide.status}`}
              panelClassName="guide-detail-panel"
              panelId={panelId}
              summary={
                <>
                  <strong className="guide-row-title">{guide.title}</strong>
                  <span className="guide-row-slug">
                    {guide.slug} · {guide.route_points.length} pkt przebiegu
                  </span>
                </>
              }
              summaryClassName="guide-row-copy"
              toggleClassName="guide-row-toggle"
              onToggle={() => guideActions.toggleGuide(guide.id)}
            >
              <GuidePlacePanel
                availablePlaces={availablePlaces}
                cities={cities}
                guideDetail={guideActions.guideDetail}
                isLoading={guideActions.isGuideDetailLoading}
                placeQuery={guideActions.placeQuery}
                selectedCityId={selectedGuideCityId}
                selectablePlaces={selectablePlaces}
                selectedPlaceIds={guideActions.selectedPlaceIds}
                selectedGuide={guideActions.selectedGuide}
                onAddPlaces={guideActions.addPlaces}
                onMovePlace={guideActions.movePlace}
                onRemovePlace={guideActions.removePlace}
                onPlaceQueryChange={guideActions.setPlaceQuery}
                onSelectedCityChange={guideActions.setSelectedCityId}
                onTogglePlaceSelection={guideActions.toggleSelectedPlace}
              />
            </AdminDisclosureRow>
          );
        })}
        {guides.length === 0 ? <p className="ui-empty">Brak tras. Dodaj pierwszą trasę przyciskiem powyżej.</p> : null}
        {guides.length > 0 && visibleGuides.length === 0 ? (
          <p className="ui-empty">Brak tras dla wybranego statusu.</p>
        ) : null}
      </div>

      {guideActions.isGuideModalOpen ? (
        <GuideFormModal
          articleBlocks={guideActions.articleBlocks}
          description={guideActions.description}
          editingGuide={guideActions.editingGuide}
          generatedSlug={guideActions.generatedSlug}
          isSaving={guideActions.isGuideSaving}
          isRoutePlacesLoading={isEditingGuidePlacesLoading}
          routePlaces={editingGuideRoutePlaces}
          routePoints={guideActions.routePoints}
          status={guideActions.status}
          title={guideActions.title}
          onAddArticleBlock={guideActions.addArticleBlock}
          onClose={guideActions.closeGuideModal}
          onConfirm={guideActions.saveGuide}
          onDescriptionChange={guideActions.setDescription}
          onRemoveArticleBlock={guideActions.removeArticleBlock}
          onRoutePointsChange={guideActions.setRoutePoints}
          onStatusChange={guideActions.setStatus}
          onTitleChange={guideActions.setTitle}
          onUpdateArticleBlock={guideActions.setArticleBlock}
          onUpdateArticleBlockType={guideActions.setArticleBlockType}
        />
      ) : null}
      {guideActions.guideToDelete ? (
        <SystemModal
          confirmLabel="Usuń"
          isBusy={guideActions.isDeletingGuide}
          message={`Trasa "${guideActions.guideToDelete.title}" zostanie trwale usunięta razem z przypięciami miejsc i zgłoszeniami dotyczącymi tej trasy. Same miejsca zostaną w bazie.`}
          title="Usunąć trasę?"
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
