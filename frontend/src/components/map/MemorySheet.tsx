import { useEffect, useState } from "react";

import type { PlaceMapItem } from "../../api/client";
import { MemoryPanel } from "../places/MemoryPanel";
import { ResponsiveSheet } from "../ui/ResponsiveSheet";

type Props = {
  onClose: () => void;
  onUploaded?: () => void;
  place: PlaceMapItem | null;
};

export function MemorySheet({ onClose, onUploaded, place }: Props) {
  const [visitToken, setVisitToken] = useState("");
  const isUnlocked = visitToken.trim().length > 0;

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
            Token
            <input
              autoComplete="off"
              placeholder="Wpisz token"
              value={visitToken}
              onChange={(event) => setVisitToken(event.target.value)}
            />
          </label>
          {isUnlocked ? <MemoryPanel placeId={place.id} showHeading={false} onUploaded={onUploaded} /> : null}
        </div>
      ) : null}
    </ResponsiveSheet>
  );
}
