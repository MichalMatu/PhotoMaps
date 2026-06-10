import type { Photo, PlaceMapItem } from "../../api/client";
import { ReportForm } from "../places/ReportForm";
import { ResponsiveSheet } from "../ui/ResponsiveSheet";

type Props = {
  onClose: () => void;
  target: { photo: Photo; place: PlaceMapItem } | null;
};

export function ReportSheet({ onClose, target }: Props) {
  return (
    <ResponsiveSheet
      open={Boolean(target)}
      title="Zgłoś problem"
      subtitle={target ? `${target.place.title} · zdjęcie` : "Zdjęcie"}
      storageId="report-sheet"
      className="pm-sheet--report"
      onClose={onClose}
    >
      {target ? (
        <div className="report-sheet-content">
          <ReportForm targetId={target.photo.id} targetType="photo" showHeading={false} />
        </div>
      ) : null}
    </ResponsiveSheet>
  );
}
