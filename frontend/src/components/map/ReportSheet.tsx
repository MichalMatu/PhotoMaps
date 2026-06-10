import type { PlaceMapItem } from "../../api/client";
import type { PlaceMapVisualItem } from "./placePreview";
import { ReportForm } from "../places/ReportForm";
import { ResponsiveSheet } from "../ui/ResponsiveSheet";

type Props = {
  onClose: () => void;
  target: { item: PlaceMapVisualItem; place: PlaceMapItem } | null;
};

function targetLabel(item: PlaceMapVisualItem) {
  return item.kind === "memory" ? "pamiątka" : "zdjęcie";
}

export function ReportSheet({ onClose, target }: Props) {
  return (
    <ResponsiveSheet
      open={Boolean(target)}
      title="Zgłoś problem"
      subtitle={target ? `${target.place.title} · ${targetLabel(target.item)}` : "Zdjęcie"}
      storageId="report-sheet"
      className="pm-sheet--report"
      onClose={onClose}
    >
      {target ? (
        <div className="report-sheet-content">
          <ReportForm targetId={target.item.id} targetType={target.item.kind} showHeading={false} />
        </div>
      ) : null}
    </ResponsiveSheet>
  );
}
