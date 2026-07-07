import {
  CLAIM_TOKEN_MAX_LENGTH,
  MEMORY_AUTHOR_MAX_LENGTH,
  MEMORY_CAPTION_MAX_LENGTH,
  MEMORY_TEXT_MAX_LENGTH,
} from "../places/memoryValidation";
import { PUBLIC_PLACE_INTERACTION_HELP } from "../places/publicPlaceInteractionHelp";
import { SettingField } from "../ui/SettingField";
import { SystemModal } from "../ui/SystemModal";
import type { MemoryOwnerToolsModel } from "./useMemoryOwnerTools";

type Props = {
  tools: MemoryOwnerToolsModel;
};

export function MemoryOwnerTools({ tools }: Props) {
  const ownerModalTitle = tools.isClaimVerified ? "Edytuj pamiątkę" : "Odblokuj edycję pamiątki";
  const ownerModalSize = tools.isClaimVerified ? "wide" : "default";

  return (
    <div className="memory-owner-tools">
      <button className="memory-owner-link" type="button" onClick={tools.handleToggleOwnerTools}>
        Edytuj
      </button>
      {tools.isOwnerToolsOpen ? (
        <SystemModal
          eyebrow="Pamiątki"
          showActions={false}
          size={ownerModalSize}
          title={ownerModalTitle}
          onClose={tools.handleToggleOwnerTools}
        >
          {!tools.isClaimVerified ? (
            <form className="ui-form memory-owner-form" noValidate onSubmit={tools.handleVerifyClaim}>
              <SettingField
                id="photo-detail-claim-token"
                label="Token pamiątki"
                hint={PUBLIC_PLACE_INTERACTION_HELP["memory-token"]}
                helpMode="inline"
                footer={
                  tools.claimFieldErrors.claimToken ? (
                    <span className="field-error" id="photo-detail-claim-token-error">
                      {tools.claimFieldErrors.claimToken}
                    </span>
                  ) : null
                }
              >
                <input
                  autoComplete="off"
                  aria-describedby={tools.claimFieldErrors.claimToken ? "photo-detail-claim-token-error" : undefined}
                  aria-invalid={Boolean(tools.claimFieldErrors.claimToken)}
                  maxLength={CLAIM_TOKEN_MAX_LENGTH}
                  value={tools.claimToken}
                  onChange={(event) => tools.setClaimToken(event.target.value)}
                />
              </SettingField>
              <button type="submit" disabled={tools.isOwnerSaving}>
                {tools.isOwnerSaving ? "Sprawdzanie..." : "Odblokuj"}
              </button>
            </form>
          ) : (
            <form className="ui-form memory-owner-form" noValidate onSubmit={tools.handleUpdateMemory}>
              <SettingField
                id="photo-detail-caption"
                label="Podpis"
                hint={PUBLIC_PLACE_INTERACTION_HELP["memory-caption"]}
                helpMode="inline"
                footer={
                  tools.editFieldErrors.caption ? (
                    <span className="field-error" id="photo-detail-caption-error">
                      {tools.editFieldErrors.caption}
                    </span>
                  ) : null
                }
              >
                <input
                  aria-describedby={tools.editFieldErrors.caption ? "photo-detail-caption-error" : undefined}
                  aria-invalid={Boolean(tools.editFieldErrors.caption)}
                  maxLength={MEMORY_CAPTION_MAX_LENGTH}
                  value={tools.draftCaption}
                  onChange={(event) => tools.setDraftCaption(event.target.value)}
                  required
                />
              </SettingField>
              <SettingField
                id="photo-detail-memory-text"
                label="Myśl / wspomnienie"
                hint={PUBLIC_PLACE_INTERACTION_HELP["memory-text"]}
                helpMode="inline"
                footer={
                  tools.editFieldErrors.memoryText ? (
                    <span className="field-error" id="photo-detail-memory-text-error">
                      {tools.editFieldErrors.memoryText}
                    </span>
                  ) : null
                }
              >
                <textarea
                  aria-describedby={tools.editFieldErrors.memoryText ? "photo-detail-memory-text-error" : undefined}
                  aria-invalid={Boolean(tools.editFieldErrors.memoryText)}
                  maxLength={MEMORY_TEXT_MAX_LENGTH}
                  rows={3}
                  value={tools.draftMemoryText}
                  onChange={(event) => tools.setDraftMemoryText(event.target.value)}
                  required
                />
              </SettingField>
              <div className="memory-owner-field-row">
                <SettingField
                  id="photo-detail-author-name"
                  label="Imię"
                  hint={PUBLIC_PLACE_INTERACTION_HELP["memory-author-name"]}
                  helpMode="inline"
                  footer={
                    tools.editFieldErrors.authorName ? (
                      <span className="field-error" id="photo-detail-author-name-error">
                        {tools.editFieldErrors.authorName}
                      </span>
                    ) : null
                  }
                >
                  <input
                    aria-describedby={tools.editFieldErrors.authorName ? "photo-detail-author-name-error" : undefined}
                    aria-invalid={Boolean(tools.editFieldErrors.authorName)}
                    maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                    value={tools.draftAuthorName}
                    onChange={(event) => tools.setDraftAuthorName(event.target.value)}
                  />
                </SettingField>
                <SettingField
                  id="photo-detail-author-city"
                  label="Miasto"
                  hint={PUBLIC_PLACE_INTERACTION_HELP["memory-author-city"]}
                  helpMode="inline"
                  footer={
                    tools.editFieldErrors.authorCity ? (
                      <span className="field-error" id="photo-detail-author-city-error">
                        {tools.editFieldErrors.authorCity}
                      </span>
                    ) : null
                  }
                >
                  <input
                    aria-describedby={tools.editFieldErrors.authorCity ? "photo-detail-author-city-error" : undefined}
                    aria-invalid={Boolean(tools.editFieldErrors.authorCity)}
                    maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                    value={tools.draftAuthorCity}
                    onChange={(event) => tools.setDraftAuthorCity(event.target.value)}
                  />
                </SettingField>
              </div>
              <div className="memory-owner-actions">
                <button type="submit" disabled={tools.isOwnerSaving}>
                  {tools.isOwnerSaving ? "Zapisywanie..." : "Zapisz zmiany"}
                </button>
                <button
                  className="ui-button ui-button--danger"
                  type="button"
                  disabled={tools.isOwnerSaving}
                  onClick={tools.handleDeleteMemory}
                >
                  Usuń
                </button>
              </div>
            </form>
          )}
          {tools.ownerSuccessMessage ? <p className="memory-owner-message">{tools.ownerSuccessMessage}</p> : null}
        </SystemModal>
      ) : null}
    </div>
  );
}
