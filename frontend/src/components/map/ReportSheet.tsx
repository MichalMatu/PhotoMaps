import type { PlaceMapItem } from "../../api/client";
import type { PlaceMapVisualItem } from "./placePreview";
import { ReportForm } from "../places/ReportForm";
import { SystemModal } from "../ui/SystemModal";

type Props = {
  onClose: () => void;
  target: { item: PlaceMapVisualItem; place: PlaceMapItem } | null;
};

function targetLabel(item: PlaceMapVisualItem) {
  return item.kind === "memory" ? "pamiątka" : "zdjęcie";
}

export function ReportSheet({ onClose, target }: Props) {
  if (!target) {
    return null;
  }

  return (
    <SystemModal
      eyebrow={`${target.place.title} · ${targetLabel(target.item)}`}
      showActions={false}
      title="Zgłoś problem"
      onClose={onClose}
    >
      <div className="report-sheet-content">
        <ReportForm targetId={target.item.id} targetType={target.item.kind} showHeading={false} />
      </div>
    </SystemModal>
  );
}
