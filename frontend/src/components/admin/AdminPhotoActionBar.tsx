import { Check, Eraser, Eye, EyeOff, Pencil, Star, StarOff, Trash2, Undo2, X } from "lucide-react";

import type { AdminPhoto, ReviewFinalStatus } from "../../api/types";
import { AdminActionIconButton } from "./AdminActionIconButton";

type Props = {
  isCover: boolean;
  isSettingCover?: boolean;
  photo: AdminPhoto;
  onClearCover?: () => void;
  onDelete: () => void;
  onEditText: () => void;
  onPreview?: () => void;
  onRedact?: () => void;
  onReview: (status: ReviewFinalStatus) => void;
  onSetCover?: () => void;
};

export function AdminPhotoActionBar({
  isCover,
  isSettingCover = false,
  photo,
  onClearCover,
  onDelete,
  onEditText,
  onPreview,
  onRedact,
  onReview,
  onSetCover,
}: Props) {
  const approveLabel = photo.status === "rejected" ? "Przywróć" : "Zatwierdź";
  const rejectLabel = photo.status === "approved" ? "Ukryj" : "Odrzuć";

  return (
    <div className="admin-media-card-actions">
      {onPreview ? <AdminPhotoActionButton icon={Eye} label="Podgląd" onClick={onPreview} /> : null}
      <AdminPhotoActionButton icon={Pencil} label="Edytuj tekst" onClick={onEditText} />
      {onRedact ? <AdminPhotoActionButton icon={Eraser} label="Anonimizuj" onClick={onRedact} /> : null}
      {photo.status !== "approved" ? (
        <AdminPhotoActionButton
          icon={photo.status === "rejected" ? Undo2 : Check}
          label={approveLabel}
          tone="primary"
          onClick={() => onReview("approved")}
        />
      ) : null}
      {photo.status !== "rejected" ? (
        <AdminPhotoActionButton
          icon={photo.status === "approved" ? EyeOff : X}
          label={rejectLabel}
          tone="secondary"
          onClick={() => onReview("rejected")}
        />
      ) : null}
      {photo.status === "approved" && !isCover && onSetCover ? (
        <AdminPhotoActionButton disabled={isSettingCover} icon={Star} label="Ustaw jako główne" onClick={onSetCover} />
      ) : null}
      {isCover && onClearCover ? (
        <AdminPhotoActionButton
          disabled={isSettingCover}
          icon={StarOff}
          label="Zdejmij główne"
          onClick={onClearCover}
        />
      ) : null}
      <AdminPhotoActionButton icon={Trash2} label="Usuń" tone="danger" onClick={onDelete} />
    </div>
  );
}

type ActionButtonProps = Omit<Parameters<typeof AdminActionIconButton>[0], "className" | "iconSize">;

function AdminPhotoActionButton(props: ActionButtonProps) {
  return <AdminActionIconButton {...props} className="admin-media-card-action" iconSize={16} />;
}
