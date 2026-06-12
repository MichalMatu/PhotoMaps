import type { Guide, GuideStatus } from "../../api/client";
import { SystemModal } from "./SystemModal";

type Props = {
  description: string;
  editingGuide: Guide | null;
  generatedSlug: string;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDescriptionChange: (value: string) => void;
  onStatusChange: (value: GuideStatus) => void;
  onTitleChange: (value: string) => void;
  status: GuideStatus;
  title: string;
};

export function GuideFormModal({
  description,
  editingGuide,
  generatedSlug,
  isSaving,
  onClose,
  onConfirm,
  onDescriptionChange,
  onStatusChange,
  onTitleChange,
  status,
  title,
}: Props) {
  return (
    <SystemModal
      cancelLabel="Zamknij"
      confirmDisabled={!title.trim() || (!editingGuide && !generatedSlug)}
      confirmLabel={editingGuide ? "Zapisz trasę" : "Dodaj trasę"}
      eyebrow="Trasy"
      isBusy={isSaving}
      title={editingGuide ? "Edytuj trasę" : "Dodaj trasę"}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="guide-form guide-form--modal">
        <label>
          Tytuł
          <input value={title} onChange={(event) => onTitleChange(event.target.value)} required />
        </label>
        <label>
          Opis
          <textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={4} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => onStatusChange(event.target.value as GuideStatus)}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </div>
    </SystemModal>
  );
}
