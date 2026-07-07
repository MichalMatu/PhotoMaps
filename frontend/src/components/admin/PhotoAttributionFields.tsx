import type { AdminPhoto } from "../../api/types";
import { SettingField } from "../ui/SettingField";
import { ADMIN_MEDIA_FIELD_HELP } from "./adminMediaFieldHelp";
import {
  PHOTO_ATTRIBUTION_AUTHOR_MAX_LENGTH,
  PHOTO_ATTRIBUTION_LICENSE_MAX_LENGTH,
  PHOTO_ATTRIBUTION_URL_MAX_LENGTH,
} from "./adminMediaUi";
import type { PhotoAttributionDraft } from "./placePhotoPanelState";

type Props = {
  draft: PhotoAttributionDraft;
  idPrefix?: string;
  onChange: (draft: PhotoAttributionDraft) => void;
};

export function PhotoAttributionFields({ draft, idPrefix = "photo-attribution", onChange }: Props) {
  function updateField(field: keyof PhotoAttributionDraft, value: string) {
    onChange({ ...draft, [field]: value });
  }

  return (
    <fieldset className="photo-attribution-fields">
      <legend>Atrybucja</legend>
      <div className="photo-attribution-grid">
        <SettingField id={`${idPrefix}-author`} label="Autor" hint={ADMIN_MEDIA_FIELD_HELP["attribution-author"]}>
          <input
            maxLength={PHOTO_ATTRIBUTION_AUTHOR_MAX_LENGTH}
            value={draft.attributionAuthor}
            onChange={(event) => updateField("attributionAuthor", event.target.value)}
          />
        </SettingField>
        <SettingField id={`${idPrefix}-license`} label="Licencja" hint={ADMIN_MEDIA_FIELD_HELP["attribution-license"]}>
          <input
            maxLength={PHOTO_ATTRIBUTION_LICENSE_MAX_LENGTH}
            value={draft.attributionLicense}
            onChange={(event) => updateField("attributionLicense", event.target.value)}
          />
        </SettingField>
        <SettingField
          id={`${idPrefix}-source-url`}
          label="URL źródła"
          hint={ADMIN_MEDIA_FIELD_HELP["attribution-source-url"]}
        >
          <input
            maxLength={PHOTO_ATTRIBUTION_URL_MAX_LENGTH}
            type="url"
            value={draft.attributionSourceUrl}
            onChange={(event) => updateField("attributionSourceUrl", event.target.value)}
          />
        </SettingField>
        <SettingField
          id={`${idPrefix}-license-url`}
          label="URL licencji"
          hint={ADMIN_MEDIA_FIELD_HELP["attribution-license-url"]}
        >
          <input
            maxLength={PHOTO_ATTRIBUTION_URL_MAX_LENGTH}
            type="url"
            value={draft.attributionLicenseUrl}
            onChange={(event) => updateField("attributionLicenseUrl", event.target.value)}
          />
        </SettingField>
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
