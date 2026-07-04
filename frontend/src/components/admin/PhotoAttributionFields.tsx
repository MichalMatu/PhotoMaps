import type { AdminPhoto } from "../../api/types";
import {
  PHOTO_ATTRIBUTION_AUTHOR_MAX_LENGTH,
  PHOTO_ATTRIBUTION_LICENSE_MAX_LENGTH,
  PHOTO_ATTRIBUTION_URL_MAX_LENGTH,
} from "./adminMediaUi";
import type { PhotoAttributionDraft } from "./placePhotoPanelState";

type Props = {
  draft: PhotoAttributionDraft;
  onChange: (draft: PhotoAttributionDraft) => void;
};

export function PhotoAttributionFields({ draft, onChange }: Props) {
  function updateField(field: keyof PhotoAttributionDraft, value: string) {
    onChange({ ...draft, [field]: value });
  }

  return (
    <fieldset className="photo-attribution-fields">
      <legend>Atrybucja</legend>
      <div className="photo-attribution-grid">
        <label>
          Autor
          <input
            maxLength={PHOTO_ATTRIBUTION_AUTHOR_MAX_LENGTH}
            value={draft.attributionAuthor}
            onChange={(event) => updateField("attributionAuthor", event.target.value)}
          />
        </label>
        <label>
          Licencja
          <input
            maxLength={PHOTO_ATTRIBUTION_LICENSE_MAX_LENGTH}
            value={draft.attributionLicense}
            onChange={(event) => updateField("attributionLicense", event.target.value)}
          />
        </label>
        <label>
          URL źródła
          <input
            maxLength={PHOTO_ATTRIBUTION_URL_MAX_LENGTH}
            type="url"
            value={draft.attributionSourceUrl}
            onChange={(event) => updateField("attributionSourceUrl", event.target.value)}
          />
        </label>
        <label>
          URL licencji
          <input
            maxLength={PHOTO_ATTRIBUTION_URL_MAX_LENGTH}
            type="url"
            value={draft.attributionLicenseUrl}
            onChange={(event) => updateField("attributionLicenseUrl", event.target.value)}
          />
        </label>
      </div>
    </fieldset>
  );
}

export function PhotoAttributionSummary({ photo }: { photo: AdminPhoto }) {
  if (
    !photo.attribution_author &&
    !photo.attribution_license &&
    !photo.attribution_source_url &&
    !photo.attribution_license_url
  ) {
    return null;
  }

  return (
    <div className="admin-photo-attribution">
      {photo.attribution_author ? (
        <span title={`Autor: ${photo.attribution_author}`}>Autor: {photo.attribution_author}</span>
      ) : null}
      {photo.attribution_license ? (
        <span title={`Licencja: ${photo.attribution_license}`}>Licencja: {photo.attribution_license}</span>
      ) : null}
      {photo.attribution_source_url ? (
        <a href={photo.attribution_source_url} target="_blank" rel="noreferrer" title="Źródło">
          Źródło
        </a>
      ) : null}
      {photo.attribution_license_url ? (
        <a href={photo.attribution_license_url} target="_blank" rel="noreferrer" title="Warunki licencji">
          Warunki licencji
        </a>
      ) : null}
    </div>
  );
}
