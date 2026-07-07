import type { AdminPlace, AppConfigMap, Category, City, PlaceCustomFieldDefinition } from "../../api/types";
import { PlaceArticleFields } from "./PlaceArticleFields";
import { PlaceBasicFields } from "./PlaceBasicFields";
import { PlaceCategoryFields } from "./PlaceCategoryFields";
import { PlaceCoverPhotoFields } from "./PlaceCoverPhotoFields";
import { PlaceCustomFields } from "./PlaceCustomFields";
import { usePlaceFormDraft } from "./usePlaceFormDraft";
import type { PlaceFormPayload } from "./useAdminPlaceManagement";
import type { PlaceLocation } from "./placeLocationAutoSave";

type Props = {
  categories: Category[];
  cities: City[];
  className?: string;
  mapFallback: AppConfigMap;
  place?: AdminPlace | null;
  placeCustomFieldDefinitions: PlaceCustomFieldDefinition[];
  secondaryAction?: {
    detail?: string;
    label: string;
    onClick: () => void;
  };
  onCancel?: () => void;
  onLocationAutoSave?: (location: PlaceLocation) => Promise<void>;
  onManageCategories?: () => void;
  onSubmit: (payload: PlaceFormPayload) => Promise<void>;
};

export function PlaceForm({
  categories,
  cities,
  className = "ui-form admin-form",
  mapFallback,
  onCancel,
  onLocationAutoSave,
  onManageCategories,
  onSubmit,
  place,
  placeCustomFieldDefinitions,
  secondaryAction,
}: Props) {
  const draft = usePlaceFormDraft({
    categories,
    cities,
    mapFallback,
    onLocationAutoSave,
    onSubmit,
    place,
    placeCustomFieldDefinitions,
  });

  return (
    <form className={className} onSubmit={draft.handleSubmit}>
      <PlaceBasicFields
        availableCities={draft.availableCities}
        cityId={draft.cityId}
        description={draft.description}
        localComment={draft.localComment}
        location={draft.location}
        locationAutoSaveStatus={draft.locationAutoSaveStatus}
        selectedCityName={draft.selectedCityName}
        status={draft.status}
        title={draft.title}
        weight={draft.weight}
        onCityChange={draft.handleCityChange}
        onDescriptionChange={draft.setDescription}
        onLocalCommentChange={draft.setLocalComment}
        onLocationChange={draft.setLocation}
        onStatusChange={draft.setStatus}
        onTitleChange={draft.setTitle}
        onWeightChange={draft.setWeight}
      />

      <PlaceCategoryFields
        categories={draft.availableCategories}
        categoryIds={draft.categoryIds}
        onManageCategories={onManageCategories}
        onToggleCategory={draft.toggleCategory}
      />

      <PlaceArticleFields
        articleBlocks={draft.articleBlocks}
        onAddBlock={draft.addArticleBlock}
        onRemoveBlock={draft.removeArticleBlock}
        onUpdateBlock={draft.updateArticleBlock}
        onUpdateBlockType={draft.updateArticleBlockType}
      />

      <PlaceCustomFields
        customFieldValues={draft.customFieldValues}
        fields={draft.sortedCustomFields}
        onFieldChange={draft.handleCustomFieldChange}
      />

      {!place ? (
        <PlaceCoverPhotoFields
          audioError={draft.coverPhotoAudioError}
          audioFile={draft.coverPhotoAudioFile}
          attributionDraft={draft.coverPhotoAttributionDraft}
          caption={draft.coverPhotoCaption}
          descriptionBlocks={draft.coverPhotoDescriptionBlocks}
          file={draft.coverPhotoFile}
          inputKey={draft.coverPhotoInputKey}
          onAddDescriptionBlock={draft.addCoverPhotoDescriptionBlock}
          onAudioFileChange={draft.setCoverPhotoAudioFile}
          onAttributionDraftChange={draft.setCoverPhotoAttributionDraft}
          onCaptionChange={draft.setCoverPhotoCaption}
          onFileChange={draft.setCoverPhotoFile}
          onRemoveDescriptionBlock={draft.removeCoverPhotoDescriptionBlock}
          onUpdateDescriptionBlock={draft.updateCoverPhotoDescriptionBlock}
          onUpdateDescriptionBlockType={draft.updateCoverPhotoDescriptionBlockType}
        />
      ) : null}

      <div className="place-form-actions">
        {secondaryAction ? (
          <button className="ui-button ui-button--secondary" type="button" onClick={secondaryAction.onClick}>
            <span>{secondaryAction.label}</span>
            {secondaryAction.detail ? <span className="place-form-action-detail">{secondaryAction.detail}</span> : null}
          </button>
        ) : null}
        {onCancel ? (
          <button className="ui-button ui-button--ghost" type="button" onClick={onCancel}>
            {place ? "Anuluj edycję" : "Anuluj"}
          </button>
        ) : null}
        <button
          className="ui-button ui-button--primary"
          type="submit"
          disabled={!draft.cityId || !draft.generatedSlug || draft.isSaving || Boolean(draft.coverPhotoAudioError)}
        >
          {draft.isSaving ? "Zapisywanie..." : place ? "Zapisz zmiany" : "Dodaj miejsce"}
        </button>
      </div>
    </form>
  );
}
