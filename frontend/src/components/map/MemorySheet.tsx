import type { PlaceMapItem } from "../../api/client";
import { MemoryPanel } from "../places/MemoryPanel";
import { ResponsiveSheet } from "../ui/ResponsiveSheet";

type Props = {
  onClose: () => void;
  place: PlaceMapItem | null;
};

export function MemorySheet({ onClose, place }: Props) {
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
          <MemoryPanel placeId={place.id} showHeading={false} />
        </div>
      ) : null}
    </ResponsiveSheet>
  );
}
