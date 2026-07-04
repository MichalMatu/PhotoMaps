import { Plus } from "lucide-react";
import { useState } from "react";

import type { AdminPhoto, City, Place } from "../../api/types";
import { AdminPhotoGalleryModal } from "./AdminPhotoGalleryModal";
import { MediaRedactionModal } from "./MediaRedactionModal";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { PlacePhotoCard } from "./PlacePhotoCard";
import { PhotoTextEditModal } from "./PhotoTextEditModal";
import { SystemModal } from "./SystemModal";
import { usePlacePhotoPanel } from "./usePlacePhotoPanel";

type Props = {
  cities: City[];
  onChanged: () => Promise<void>;
  photos: AdminPhoto[];
  place: Place;
};

export function PlacePhotoPanel({ cities, onChanged, photos, place }: Props) {
  const [galleryPhotoId, setGalleryPhotoId] = useState<string | null>(null);
  const panel = usePlacePhotoPanel({ onChanged, photos, place });
  const editingPhoto = panel.editingPhotoId
    ? (panel.sortedPhotos.find((photo) => photo.id === panel.editingPhotoId) ?? null)
    : null;

  return (
    <section className="place-photo-panel">
      <div className="place-photo-panel-toolbar">
        <div className="place-photo-panel-context">
          <strong>{place.title}</strong>
          <span>{photos.length === 1 ? "1 zdjęcie" : `${photos.length} zdjęć`}</span>
        </div>
        <button className="ui-button ui-button--primary photo-add-button" type="button" onClick={panel.openUploadModal}>
          <Plus aria-hidden="true" size={16} />
          Dodaj zdjęcie
        </button>
      </div>

      <div className="place-photo-strip">
        {panel.sortedPhotos.map((photo) => {
          const isCover = place.cover_photo_id === photo.id;
          return (
            <PlacePhotoCard
              isCover={isCover}
              isSettingCover={panel.isSettingCover}
              key={photo.id}
              photo={photo}
              placeTitle={place.title}
              onClearCover={panel.handleClearCover}
              onPreview={(nextPhoto) => setGalleryPhotoId(nextPhoto.id)}
              onRequestDelete={panel.setPhotoToDelete}
              onReview={panel.handleReview}
              onSetCover={panel.handleSetCover}
              onStartCaptionEdit={panel.handleStartCaptionEdit}
            />
          );
        })}
        {photos.length === 0 ? <p className="ui-empty">Brak zdjęć dla tego miejsca.</p> : null}
      </div>

      {panel.isUploadModalOpen ? (
        <PhotoUploadModal
          audioFile={panel.audioFile}
          audioError={panel.audioError}
          attributionDraft={panel.uploadAttributionDraft}
          canSubmit={panel.canUpload}
          caption={panel.caption}
          cities={cities}
          cityId={place.city_id}
          descriptionBlocks={panel.descriptionBlocks}
          file={panel.file}
          inputKey={panel.inputKey}
          isUploading={panel.isUploading}
          lockedPlace={place}
          placeId={place.id}
          places={[place]}
          onAddDescriptionBlock={panel.addDescriptionBlock}
          onAudioFileChange={panel.setAudioFile}
          onAttributionDraftChange={panel.setUploadAttributionDraft}
          onCaptionChange={panel.setCaption}
          onCityChange={() => undefined}
          onClose={panel.closeUploadModal}
          onConfirm={panel.handleUpload}
          onFileChange={panel.setFile}
          onPlaceChange={() => undefined}
          onRemoveDescriptionBlock={panel.removeDescriptionBlock}
          onUpdateDescriptionBlock={panel.updateDescriptionBlock}
          onUpdateDescriptionBlockType={panel.updateDescriptionBlockType}
        />
      ) : null}

      {galleryPhotoId ? (
        <AdminPhotoGalleryModal
          currentPhotoId={galleryPhotoId}
          isSettingCover={panel.isSettingCover}
          photos={panel.sortedPhotos}
          place={place}
          onClearCover={panel.handleClearCover}
          onClose={() => setGalleryPhotoId(null)}
          onCurrentPhotoChange={setGalleryPhotoId}
          onDeleteAudio={panel.handleDeleteAudio}
          onEditText={panel.handleStartCaptionEdit}
          onError={panel.setErrorMessage}
          onRedact={panel.setPhotoToRedact}
          onRequestDelete={(photo) => {
            setGalleryPhotoId(null);
            panel.setPhotoToDelete(photo);
          }}
          onReview={panel.handleReview}
          onSaveAudio={panel.handleSaveAudio}
          onSetCover={panel.handleSetCover}
        />
      ) : null}

      {panel.photoToRedact ? (
        <MediaRedactionModal
          isApplying={panel.isApplyingRedaction}
          kind="photo"
          media={panel.photoToRedact}
          onApply={panel.handleApplyRedaction}
          onClose={() => panel.setPhotoToRedact(null)}
        />
      ) : null}

      {editingPhoto ? (
        <PhotoTextEditModal
          attributionDraft={panel.attributionDraft}
          captionDraft={panel.captionDraft}
          descriptionDraftBlocks={panel.descriptionDraftBlocks}
          isSaving={panel.isSavingCaption}
          photo={editingPhoto}
          onAddDescriptionDraftBlock={panel.addDescriptionDraftBlock}
          onAttributionDraftChange={panel.setAttributionDraft}
          onCaptionDraftChange={panel.setCaptionDraft}
          onClose={panel.handleCancelCaptionEdit}
          onRemoveDescriptionDraftBlock={panel.removeDescriptionDraftBlock}
          onSave={panel.handleSaveCaption}
          onUpdateDescriptionDraftBlock={panel.updateDescriptionDraftBlock}
          onUpdateDescriptionDraftBlockType={panel.updateDescriptionDraftBlockType}
        />
      ) : null}

      {panel.photoToDelete ? (
        <SystemModal
          confirmLabel="Usuń"
          isBusy={panel.isDeleting}
          message="Zdjęcie zostanie usunięte z bazy i plików. Tej operacji nie da się cofnąć."
          title="Usunąć zdjęcie?"
          tone="danger"
          onClose={() => panel.setPhotoToDelete(null)}
          onConfirm={panel.handleConfirmDelete}
        />
      ) : null}
      {panel.errorMessage ? (
        <SystemModal
          confirmLabel="Rozumiem"
          message={panel.errorMessage}
          title="Operacja nie powiodła się"
          tone="error"
          onClose={() => panel.setErrorMessage(null)}
        />
      ) : null}
    </section>
  );
}
