import { Info } from "lucide-react";
import type { MouseEvent } from "react";

import type { PlaceCustomFieldDisplayItem } from "../../placeCustomFields";
import type { MapMediaDisplay } from "../mediaDisplayText";
import type { PlaceMapVisualItem } from "../placePreview";

type PhotoAttributionDisplay = {
  licenseUrl: string | null;
  sourceUrl: string | null;
  text: string[];
};

export type PhotoDetailInfoPanelProps = {
  customFields: PlaceCustomFieldDisplayItem[];
  display: MapMediaDisplay;
  isExpanded: boolean;
  item: PlaceMapVisualItem;
  onCollapse: () => void;
  onToggle: () => void;
};

function photoAttributionDisplay(item: PlaceMapVisualItem): PhotoAttributionDisplay | null {
  if (item.kind !== "photo") {
    return null;
  }

  const text = [
    item.attribution_author ? `Autor: ${item.attribution_author}` : null,
    item.attribution_license ? `Licencja: ${item.attribution_license}` : null,
  ].filter((value): value is string => Boolean(value));

  if (text.length === 0 && !item.attribution_source_url && !item.attribution_license_url) {
    return null;
  }

  return {
    licenseUrl: item.attribution_license_url,
    sourceUrl: item.attribution_source_url,
    text,
  };
}

export function hasPhotoDetailInfo({
  customFields,
  display,
  item,
}: Pick<PhotoDetailInfoPanelProps, "customFields" | "display" | "item">) {
  return Boolean(
    display.title || display.body || display.meta || customFields.length > 0 || photoAttributionDisplay(item),
  );
}

export function PhotoDetailInfoPanel({
  customFields,
  display,
  isExpanded,
  item,
  onCollapse,
  onToggle,
}: PhotoDetailInfoPanelProps) {
  const photoAttribution = photoAttributionDisplay(item);
  const hasDisplayText = Boolean(display.title || display.body || display.meta);

  if (!hasPhotoDetailInfo({ customFields, display, item })) {
    return null;
  }

  const handleCopyClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest("a")) {
      return;
    }

    onCollapse();
  };

  return (
    <>
      <button
        className="photo-detail-copy-toggle"
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Ukryj informacje" : "Pokaż informacje"}
        title={isExpanded ? "Ukryj informacje" : "Pokaż informacje"}
        onClick={onToggle}
      >
        <Info aria-hidden="true" size={18} />
      </button>
      <div className="photo-detail-copy" onClick={handleCopyClick}>
        {hasDisplayText ? (
          <div className="photo-detail-text">
            {display.title ? <span className="photo-detail-text-title">{display.title}</span> : null}
            {display.body ? <span className="photo-detail-text-body">{display.body}</span> : null}
            {display.meta ? <span className="photo-detail-text-meta">{display.meta}</span> : null}
          </div>
        ) : null}
        {customFields.length > 0 ? (
          <dl className="photo-detail-custom-fields">
            {customFields.map((field) => (
              <div className="photo-detail-custom-field" key={field.key}>
                <dt>{field.label}</dt>
                <dd>
                  {field.href ? (
                    <a href={field.href} target="_blank" rel="noreferrer">
                      {field.text}
                    </a>
                  ) : (
                    field.text
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {photoAttribution ? (
          <div className="photo-detail-attribution">
            {photoAttribution.text.map((text) => (
              <span key={text}>{text}</span>
            ))}
            {photoAttribution.sourceUrl ? (
              <a href={photoAttribution.sourceUrl} target="_blank" rel="noreferrer">
                Źródło
              </a>
            ) : null}
            {photoAttribution.licenseUrl ? (
              <a href={photoAttribution.licenseUrl} target="_blank" rel="noreferrer">
                Warunki licencji
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
