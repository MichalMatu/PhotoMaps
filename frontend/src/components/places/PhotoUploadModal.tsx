import { PhotoUploadForm } from "./PhotoUploadForm";

type Props = {
  placeId: string;
  placeTitle: string;
  onClose: () => void;
  onUploaded?: () => void;
};

export function PhotoUploadModal({ placeId, placeTitle, onClose, onUploaded }: Props) {
  function handleUploaded() {
    onUploaded?.();
    onClose();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Dodaj zdjęcie: ${placeTitle}`}>
      <div className="upload-modal">
        <button className="modal-close-button" type="button" onClick={onClose} aria-label="Zamknij">
          x
        </button>
        <span className="eyebrow">Nowe zdjęcie</span>
        <h2>{placeTitle}</h2>
        <PhotoUploadForm placeId={placeId} onUploaded={handleUploaded} />
      </div>
    </div>
  );
}
