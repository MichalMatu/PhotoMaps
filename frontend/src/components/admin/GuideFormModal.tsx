import type { FormEvent } from "react";

import type { ContentBlock, ContentBlockType, Guide, GuideRoutePoint, GuideStatus } from "../../api/types";
import { ContentBlockEditor } from "../content/ContentBlockEditor";
import { ADMIN_GUIDE_STATUS_OPTIONS } from "./adminStatusUi";
import { GuideRoutePointEditor } from "./GuideRoutePointEditor";
import { SystemModal } from "./SystemModal";

type GuideRoutePlace = {
  id: string;
  lat: number;
  lon: number;
  title: string;
};

type Props = {
  articleBlocks: ContentBlock[];
  description: string;
  editingGuide: Guide | null;
  generatedSlug: string;
  isSaving: boolean;
  isRoutePlacesLoading: boolean;
  onAddArticleBlock: (type: ContentBlockType) => void;
  onClose: () => void;
  onConfirm: () => void;
  onDescriptionChange: (value: string) => void;
  onRemoveArticleBlock: (index: number) => void;
  onRoutePointsChange: (points: GuideRoutePoint[]) => void;
  onStatusChange: (value: GuideStatus) => void;
  onTitleChange: (value: string) => void;
  onUpdateArticleBlock: (index: number, block: ContentBlock) => void;
  onUpdateArticleBlockType: (index: number, type: ContentBlockType) => void;
  routePlaces: GuideRoutePlace[];
  routePoints: GuideRoutePoint[];
  status: GuideStatus;
  title: string;
};

export function GuideFormModal({
  articleBlocks,
  description,
  editingGuide,
  generatedSlug,
  isSaving,
  isRoutePlacesLoading,
  onAddArticleBlock,
  onClose,
  onConfirm,
  onDescriptionChange,
  onRemoveArticleBlock,
  onRoutePointsChange,
  onStatusChange,
  onTitleChange,
  onUpdateArticleBlock,
  onUpdateArticleBlockType,
  routePlaces,
  routePoints,
  status,
  title,
}: Props) {
  const canSubmit = Boolean(title.trim() && (editingGuide || generatedSlug));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isSaving) {
      return;
    }

    onConfirm();
  }

  return (
    <SystemModal
      cancelLabel="Zamknij"
      confirmDisabled={!canSubmit}
      confirmFormId="guide-form-modal"
      confirmLabel={editingGuide ? "Zapisz trasę" : "Dodaj trasę"}
      eyebrow="Trasy"
      size="large"
      isBusy={isSaving}
      title={editingGuide ? "Edytuj trasę" : "Dodaj trasę"}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <form id="guide-form-modal" className="ui-form guide-form guide-form--modal" onSubmit={handleSubmit}>
        <label>
          Tytuł
          <input value={title} onChange={(event) => onTitleChange(event.target.value)} required />
        </label>
        <label>
          Krótki opis
          <textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={4} />
        </label>
        <ContentBlockEditor
          blocks={articleBlocks}
          legend="Pełny opis trasy"
          onAddBlock={onAddArticleBlock}
          onRemoveBlock={onRemoveArticleBlock}
          onUpdateBlock={onUpdateArticleBlock}
          onUpdateBlockType={onUpdateArticleBlockType}
        />
        <label>
          Status
          <select value={status} onChange={(event) => onStatusChange(event.target.value as GuideStatus)}>
            {ADMIN_GUIDE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <GuideRoutePointEditor
          isPlacesLoading={isRoutePlacesLoading}
          places={routePlaces}
          points={routePoints}
          onChange={onRoutePointsChange}
        />
      </form>
    </SystemModal>
  );
}
