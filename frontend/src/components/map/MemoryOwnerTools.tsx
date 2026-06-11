import {
  CLAIM_TOKEN_MAX_LENGTH,
  MEMORY_AUTHOR_MAX_LENGTH,
  MEMORY_CAPTION_MAX_LENGTH,
  MEMORY_TEXT_MAX_LENGTH,
} from "../places/memoryValidation";
import type { MemoryOwnerToolsModel } from "./useMemoryOwnerTools";

type Props = {
  tools: MemoryOwnerToolsModel;
};

export function MemoryOwnerTools({ tools }: Props) {
  return (
    <div className="memory-owner-tools">
      <button className="memory-owner-link" type="button" onClick={tools.handleToggleOwnerTools}>
        Edytuj moją pamiątkę
      </button>
      {tools.isOwnerToolsOpen ? (
        <>
          {!tools.isClaimVerified ? (
            <form className="memory-owner-form" noValidate onSubmit={tools.handleVerifyClaim}>
              <label>
                Token pamiątki
                <input
                  autoComplete="off"
                  aria-describedby={tools.claimFieldErrors.claimToken ? "photo-detail-claim-token-error" : undefined}
                  aria-invalid={Boolean(tools.claimFieldErrors.claimToken)}
                  maxLength={CLAIM_TOKEN_MAX_LENGTH}
                  value={tools.claimToken}
                  onChange={(event) => tools.setClaimToken(event.target.value)}
                />
                {tools.claimFieldErrors.claimToken ? (
                  <span className="field-error" id="photo-detail-claim-token-error">
                    {tools.claimFieldErrors.claimToken}
                  </span>
                ) : null}
              </label>
              <button type="submit" disabled={tools.isOwnerSaving}>
                {tools.isOwnerSaving ? "Sprawdzanie..." : "Odblokuj"}
              </button>
            </form>
          ) : (
            <form className="memory-owner-form" noValidate onSubmit={tools.handleUpdateMemory}>
              <label>
                Podpis
                <input
                  aria-describedby={tools.editFieldErrors.caption ? "photo-detail-caption-error" : undefined}
                  aria-invalid={Boolean(tools.editFieldErrors.caption)}
                  maxLength={MEMORY_CAPTION_MAX_LENGTH}
                  value={tools.draftCaption}
                  onChange={(event) => tools.setDraftCaption(event.target.value)}
                  required
                />
                {tools.editFieldErrors.caption ? (
                  <span className="field-error" id="photo-detail-caption-error">
                    {tools.editFieldErrors.caption}
                  </span>
                ) : null}
              </label>
              <label>
                Myśl / wspomnienie
                <textarea
                  aria-describedby={tools.editFieldErrors.memoryText ? "photo-detail-memory-text-error" : undefined}
                  aria-invalid={Boolean(tools.editFieldErrors.memoryText)}
                  maxLength={MEMORY_TEXT_MAX_LENGTH}
                  rows={3}
                  value={tools.draftMemoryText}
                  onChange={(event) => tools.setDraftMemoryText(event.target.value)}
                  required
                />
                {tools.editFieldErrors.memoryText ? (
                  <span className="field-error" id="photo-detail-memory-text-error">
                    {tools.editFieldErrors.memoryText}
                  </span>
                ) : null}
              </label>
              <div className="memory-owner-field-row">
                <label>
                  Imię
                  <input
                    aria-describedby={tools.editFieldErrors.authorName ? "photo-detail-author-name-error" : undefined}
                    aria-invalid={Boolean(tools.editFieldErrors.authorName)}
                    maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                    value={tools.draftAuthorName}
                    onChange={(event) => tools.setDraftAuthorName(event.target.value)}
                  />
                  {tools.editFieldErrors.authorName ? (
                    <span className="field-error" id="photo-detail-author-name-error">
                      {tools.editFieldErrors.authorName}
                    </span>
                  ) : null}
                </label>
                <label>
                  Miasto
                  <input
                    aria-describedby={tools.editFieldErrors.authorCity ? "photo-detail-author-city-error" : undefined}
                    aria-invalid={Boolean(tools.editFieldErrors.authorCity)}
                    maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                    value={tools.draftAuthorCity}
                    onChange={(event) => tools.setDraftAuthorCity(event.target.value)}
                  />
                  {tools.editFieldErrors.authorCity ? (
                    <span className="field-error" id="photo-detail-author-city-error">
                      {tools.editFieldErrors.authorCity}
                    </span>
                  ) : null}
                </label>
              </div>
              <div className="memory-owner-actions">
                <button type="submit" disabled={tools.isOwnerSaving}>
                  {tools.isOwnerSaving ? "Zapisywanie..." : "Zapisz zmiany"}
                </button>
                <button
                  className="danger-button"
                  type="button"
                  disabled={tools.isOwnerSaving}
                  onClick={tools.handleDeleteMemory}
                >
                  Usuń trwale
                </button>
              </div>
            </form>
          )}
          {tools.ownerSuccessMessage ? <p className="memory-owner-message">{tools.ownerSuccessMessage}</p> : null}
        </>
      ) : null}
    </div>
  );
}
