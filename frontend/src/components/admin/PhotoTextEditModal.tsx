import type { FormEvent } from "react";

import type { AdminPhoto, ContentBlock, ContentBlockType } from "../../api/types";
import { ContentBlockEditor } from "../content/ContentBlockEditor";
import { SystemModal } from "./SystemModal";
import { PHOTO_CAPTION_MAX_LENGTH } from "./adminMediaUi";
import { PhotoAttributionFields } from "./PhotoAttributionFields";
import type { PhotoAttributionDraft } from "./placePhotoPanelState";

type Props = {
  attributionDraft: PhotoAttributionDraft;
  captionDraft: string;
  descriptionDraftBlocks: ContentBlock[];
  isSaving: boolean;
  photo: AdminPhoto;
  onAddDescriptionDraftBlock: (type: ContentBlockType) => void;
  onAttributionDraftChange: (draft: PhotoAttributionDraft) => void;
  onCaptionDraftChange: (caption: string) => void;
  onClose: () => void;
  onRemoveDescriptionDraftBlock: (index: number) => void;
  onSave: (photo: AdminPhoto) => void;
  onUpdateDescriptionDraftBlock: (index: number, block: ContentBlock) => void;
  onUpdateDescriptionDraftBlockType: (index: number, type: ContentBlockType) => void;
};

export function PhotoTextEditModal({
  attributionDraft,
  captionDraft,
  descriptionDraftBlocks,
  isSaving,
  photo,
  onAddDescriptionDraftBlock,
  onAttributionDraftChange,
  onCaptionDraftChange,
  onClose,
  onRemoveDescriptionDraftBlock,
  onSave,
  onUpdateDescriptionDraftBlock,
  onUpdateDescriptionDraftBlockType,
}: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(photo);
  }

  return (
    <SystemModal
      cancelLabel="Zamknij"
      confirmFormId="photo-text-edit-form"
      confirmLabel="Zapisz"
      eyebrow="Zdjęcie"
      isBusy={isSaving}
      size="large"
      title="Edytuj opis zdjęcia"
      onClose={onClose}
      onConfirm={() => onSave(photo)}
    >
      <form id="photo-text-edit-form" className="ui-form admin-photo-text-form" onSubmit={handleSubmit}>
        <label>
          Podpis
          <input
            maxLength={PHOTO_CAPTION_MAX_LENGTH}
            value={captionDraft}
            onChange={(event) => onCaptionDraftChange(event.target.value)}
          />
        </label>
        <ContentBlockEditor
          blocks={descriptionDraftBlocks}
          legend="Opis zdjęcia"
          onAddBlock={onAddDescriptionDraftBlock}
          onRemoveBlock={onRemoveDescriptionDraftBlock}
          onUpdateBlock={onUpdateDescriptionDraftBlock}
          onUpdateBlockType={onUpdateDescriptionDraftBlockType}
        />
        <PhotoAttributionFields draft={attributionDraft} onChange={onAttributionDraftChange} />
      </form>
    </SystemModal>
  );
}
