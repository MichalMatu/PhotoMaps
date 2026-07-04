import type { FormEvent } from "react";

import { mediaUrl } from "../../api/http";
import type { AdminMemory, ReviewFinalStatus } from "../../api/types";
import {
  MEMORY_AUTHOR_MAX_LENGTH,
  MEMORY_CAPTION_MAX_LENGTH,
  MEMORY_TEXT_MAX_LENGTH,
} from "../places/memoryValidation";
import { AdminAudioControls } from "./AdminAudioControls";
import { ADMIN_MEDIA_STATUS_LABELS } from "./adminMediaUi";

type Props = {
  authorCityDraft: string;
  authorNameDraft: string;
  captionDraft: string;
  isEditing: boolean;
  isSavingMemory: boolean;
  memory: AdminMemory;
  memoryTextDraft: string;
  onAuthorCityDraftChange: (value: string) => void;
  onAuthorNameDraftChange: (value: string) => void;
  onCancelMemoryEdit: () => void;
  onCaptionDraftChange: (value: string) => void;
  onDelete: (memory: AdminMemory) => void;
  onDeleteAudio: (memory: AdminMemory) => Promise<void>;
  onError: (message: string | null) => void;
  onMemoryTextDraftChange: (value: string) => void;
  onRedact: (memory: AdminMemory) => void;
  onReview: (memoryId: string, status: ReviewFinalStatus) => void;
  onSaveAudio: (memory: AdminMemory, file: File) => Promise<void>;
  onSaveMemory: (event: FormEvent<HTMLFormElement>, memoryId: string) => void;
  onStartMemoryEdit: (memory: AdminMemory) => void;
};

export function MemoryQueueItem({
  authorCityDraft,
  authorNameDraft,
  captionDraft,
  isEditing,
  isSavingMemory,
  memory,
  memoryTextDraft,
  onAuthorCityDraftChange,
  onAuthorNameDraftChange,
  onCancelMemoryEdit,
  onCaptionDraftChange,
  onDelete,
  onDeleteAudio,
  onError,
  onMemoryTextDraftChange,
  onRedact,
  onReview,
  onSaveAudio,
  onSaveMemory,
  onStartMemoryEdit,
}: Props) {
  return (
    <article className="ui-card admin-media-item">
      <img
        className="admin-media-item-image"
        alt={memory.caption}
        decoding="async"
        loading="lazy"
        src={mediaUrl(memory.thumb_path)}
      />
      <div className="admin-media-item-body">
        <div className="photo-meta-row">
          <span className={`ui-status ui-status--${memory.status}`}>{ADMIN_MEDIA_STATUS_LABELS[memory.status]}</span>
        </div>
        {isEditing ? (
          <form className="ui-form admin-media-edit-form" onSubmit={(event) => onSaveMemory(event, memory.id)}>
            <label>
              Podpis
              <input
                maxLength={MEMORY_CAPTION_MAX_LENGTH}
                required
                value={captionDraft}
                onChange={(event) => onCaptionDraftChange(event.target.value)}
              />
            </label>
            <label>
              Myśl / wspomnienie
              <textarea
                maxLength={MEMORY_TEXT_MAX_LENGTH}
                required
                value={memoryTextDraft}
                onChange={(event) => onMemoryTextDraftChange(event.target.value)}
              />
            </label>
            <div className="admin-media-edit-row">
              <label>
                Imię
                <input
                  maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                  value={authorNameDraft}
                  onChange={(event) => onAuthorNameDraftChange(event.target.value)}
                />
              </label>
              <label>
                Miasto
                <input
                  maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                  value={authorCityDraft}
                  onChange={(event) => onAuthorCityDraftChange(event.target.value)}
                />
              </label>
            </div>
            <div className="review-actions">
              <button className="ui-button ui-button--primary" type="submit" disabled={isSavingMemory}>
                {isSavingMemory ? "Zapisywanie..." : "Zapisz"}
              </button>
              <button className="ui-button ui-button--ghost" type="button" onClick={onCancelMemoryEdit}>
                Anuluj
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="admin-media-caption">{memory.caption}</p>
            <p className="admin-media-text">{memory.memory_text}</p>
            <AdminAudioControls
              audio={memory.audio}
              inputKeyPrefix={`memory-audio-${memory.id}`}
              onDeleteAudio={() => onDeleteAudio(memory)}
              onError={onError}
              onSaveAudio={(file) => onSaveAudio(memory, file)}
            />
            <span className="admin-media-author muted-text">
              {memory.author_name ?? "Gość"}
              {memory.author_city ? `, ${memory.author_city}` : ""}
            </span>
            <button
              className="ui-button ui-button--ghost admin-media-link-button"
              type="button"
              onClick={() => onStartMemoryEdit(memory)}
            >
              Edytuj pamiątkę
            </button>
          </>
        )}
        <div className="review-actions">
          {memory.status !== "approved" ? (
            <button type="button" onClick={() => onReview(memory.id, "approved")}>
              {memory.status === "rejected" ? "Przywróć" : "Zatwierdź"}
            </button>
          ) : null}
          {memory.status !== "rejected" ? (
            <button
              className="ui-button ui-button--secondary"
              type="button"
              onClick={() => onReview(memory.id, "rejected")}
            >
              {memory.status === "approved" ? "Ukryj" : "Odrzuć"}
            </button>
          ) : null}
          <button className="ui-button ui-button--ghost" type="button" onClick={() => onRedact(memory)}>
            Anonimizuj
          </button>
          <button className="ui-button ui-button--danger" type="button" onClick={() => onDelete(memory)}>
            Usuń
          </button>
        </div>
      </div>
    </article>
  );
}
