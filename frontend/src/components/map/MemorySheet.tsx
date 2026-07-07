import { useEffect, useState } from "react";

import type { PlaceMapItem } from "../../api/types";
import { MemoryPanel } from "../places/MemoryPanel";
import { CLAIM_TOKEN_MAX_LENGTH, CLAIM_TOKEN_MIN_LENGTH, validateClaimToken } from "../places/memoryValidation";
import { PUBLIC_PLACE_INTERACTION_HELP } from "../places/publicPlaceInteractionHelp";
import { SettingField } from "../ui/SettingField";
import { SystemModal } from "../ui/SystemModal";

type Props = {
  onClose: () => void;
  onUploaded?: () => void;
  place: PlaceMapItem | null;
};

const CLAIM_TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

function generateClaimToken() {
  const values = new Uint32Array(14);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => CLAIM_TOKEN_CHARS[value % CLAIM_TOKEN_CHARS.length]).join("");
}

export function MemorySheet({ onClose, onUploaded, place }: Props) {
  const [visitToken, setVisitToken] = useState("");
  const tokenError = visitToken.trim() ? (validateClaimToken(visitToken).claimToken ?? null) : null;
  const isUnlocked = visitToken.trim().length >= CLAIM_TOKEN_MIN_LENGTH && !tokenError;

  useEffect(() => {
    setVisitToken("");
  }, [place?.id]);

  if (!place) {
    return null;
  }

  return (
    <SystemModal eyebrow={place.title} showActions={false} title="Byłem tutaj" onClose={onClose}>
      <div className="memory-sheet-content">
        <SettingField
          id="memory-token"
          label="Token"
          hint={PUBLIC_PLACE_INTERACTION_HELP["memory-token"]}
          helpMode="inline"
          controlMode="composite"
          footer={
            tokenError ? (
              <span className="field-error" id="memory-token-error">
                {tokenError}
              </span>
            ) : null
          }
        >
          <span className="memory-token-field">
            <span className="memory-token-label-row">
              <span className="memory-token-hint">minimum 8 cyfr, znaków lub znaków specjalnych</span>
            </span>
            <button className="memory-token-generate" type="button" onClick={() => setVisitToken(generateClaimToken())}>
              generuj token
            </button>
            <input
              autoComplete="off"
              aria-describedby={["memory-token-hint", tokenError ? "memory-token-error" : null]
                .filter(Boolean)
                .join(" ")}
              aria-invalid={Boolean(tokenError)}
              maxLength={CLAIM_TOKEN_MAX_LENGTH}
              minLength={CLAIM_TOKEN_MIN_LENGTH}
              placeholder="Wpisz token"
              value={visitToken}
              onChange={(event) => setVisitToken(event.target.value)}
            />
          </span>
        </SettingField>
        {isUnlocked ? (
          <MemoryPanel claimToken={visitToken} mode="form-only" placeId={place.id} onUploaded={onUploaded} />
        ) : null}
      </div>
    </SystemModal>
  );
}
