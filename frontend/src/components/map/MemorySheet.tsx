import { useEffect, useState } from "react";

import type { PlaceMapItem } from "../../api/client";
import { MemoryPanel } from "../places/MemoryPanel";
import { ResponsiveSheet } from "../ui/ResponsiveSheet";

type Props = {
  onClose: () => void;
  onUploaded?: () => void;
  place: PlaceMapItem | null;
};

const CLAIM_TOKEN_MIN_LENGTH = 8;
const CLAIM_TOKEN_MAX_LENGTH = 64;
const CLAIM_TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

function generateClaimToken() {
  const values = new Uint32Array(14);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => CLAIM_TOKEN_CHARS[value % CLAIM_TOKEN_CHARS.length]).join("");
}

export function MemorySheet({ onClose, onUploaded, place }: Props) {
  const [visitToken, setVisitToken] = useState("");
  const isUnlocked = visitToken.trim().length >= CLAIM_TOKEN_MIN_LENGTH;

  useEffect(() => {
    setVisitToken("");
  }, [place?.id]);

  return (
    <ResponsiveSheet
      open={Boolean(place)}
      title="Byłem tutaj"
      subtitle={place?.title ?? "Miejsce"}
      storageId="memory-sheet"
      className="pm-sheet--memory"
      onClose={onClose}
    >
      {place ? (
        <div className="memory-sheet-content">
          <label className="memory-token-field">
            <span className="memory-token-label-row">
              <span>Token</span>
              <button className="memory-token-generate" type="button" onClick={() => setVisitToken(generateClaimToken())}>
                generuj token
              </button>
            </span>
            <span className="memory-token-hint">wpisz swój token, minimum 8 cyfr, znaków lub znaków specjalnych</span>
            <input
              autoComplete="off"
              maxLength={CLAIM_TOKEN_MAX_LENGTH}
              minLength={CLAIM_TOKEN_MIN_LENGTH}
              placeholder="Wpisz token"
              value={visitToken}
              onChange={(event) => setVisitToken(event.target.value)}
            />
          </label>
          {isUnlocked ? (
            <MemoryPanel
              claimToken={visitToken}
              placeId={place.id}
              showExistingMemories={false}
              showHeading={false}
              onUploaded={onUploaded}
            />
          ) : null}
        </div>
      ) : null}
    </ResponsiveSheet>
  );
}
