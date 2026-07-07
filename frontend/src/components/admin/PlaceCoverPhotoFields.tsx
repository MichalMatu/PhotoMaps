import type { ContentBlock, ContentBlockType } from "../../api/types";
import { ContentBlockEditor } from "../content/ContentBlockEditor";
import { AUDIO_FILE_ACCEPT } from "../ui/audioAttachment";
import { FileInputControl } from "../ui/FileInputControl";
import { SettingField } from "../ui/SettingField";
import { ADMIN_MEDIA_FIELD_HELP } from "./adminMediaFieldHelp";
import { PHOTO_CAPTION_MAX_LENGTH } from "./adminMediaUi";
import { PhotoAttributionFields } from "./PhotoAttributionFields";
import type { PhotoAttributionDraft } from "./placePhotoPanelState";

type Props = {
  audioError: string | null;
  audioFile: File | null;
  attributionDraft: PhotoAttributionDraft;
  caption: string;
  descriptionBlocks: ContentBlock[];
  file: File | null;
  inputKey: number;
  onAddDescriptionBlock: (type: ContentBlockType) => void;
  onAudioFileChange: (file: File | null) => void;
  onAttributionDraftChange: (draft: PhotoAttributionDraft) => void;
  onCaptionChange: (caption: string) => void;
  onFileChange: (file: File | null) => void;
  onRemoveDescriptionBlock: (index: number) => void;
  onUpdateDescriptionBlock: (index: number, block: ContentBlock) => void;
  onUpdateDescriptionBlockType: (index: number, type: ContentBlockType) => void;
};

export function PlaceCoverPhotoFields({
  audioError,
  audioFile,
  attributionDraft,
  caption,
  descriptionBlocks,
  file,
  inputKey,
  onAddDescriptionBlock,
  onAudioFileChange,
  onAttributionDraftChange,
  onCaptionChange,
  onFileChange,
  onRemoveDescriptionBlock,
  onUpdateDescriptionBlock,
  onUpdateDescriptionBlockType,
}: Props) {
  return (
    <fieldset className="cover-photo-fieldset">
      <legend>Zdjęcie główne</legend>
      <div className="cover-photo-grid">
        <SettingField
          id="place-cover-photo-file"
          label="Plik"
          hint={ADMIN_MEDIA_FIELD_HELP["photo-file"]}
          describedByProp="describedBy"
        >
          <FileInputControl accept="image/*" file={file} inputKey={`image-${inputKey}`} onChange={onFileChange} />
        </SettingField>
        <SettingField
          id="place-cover-audio-file"
          label="Audio"
          hint={ADMIN_MEDIA_FIELD_HELP["audio-file"]}
          describedByProp="describedBy"
          footer={
            audioError ? (
              <span className="field-error" id="place-cover-audio-error">
                {audioError}
              </span>
            ) : null
          }
        >
          <FileInputControl
            accept={AUDIO_FILE_ACCEPT}
            describedBy={audioError ? "place-cover-audio-error" : undefined}
            file={audioFile}
            inputKey={`audio-${inputKey}`}
            isInvalid={Boolean(audioError)}
            onChange={onAudioFileChange}
          />
        </SettingField>
        <SettingField id="place-cover-caption" label="Podpis" hint={ADMIN_MEDIA_FIELD_HELP.caption}>
          <input
            maxLength={PHOTO_CAPTION_MAX_LENGTH}
            value={caption}
            onChange={(event) => onCaptionChange(event.target.value)}
          />
        </SettingField>
      </div>
      <ContentBlockEditor
        blocks={descriptionBlocks}
        idPrefix="place-cover-description"
        legend="Opis zdjęcia"
        onAddBlock={onAddDescriptionBlock}
        onRemoveBlock={onRemoveDescriptionBlock}
        onUpdateBlock={onUpdateDescriptionBlock}
        onUpdateBlockType={onUpdateDescriptionBlockType}
      />
      <PhotoAttributionFields
        draft={attributionDraft}
        idPrefix="place-cover-attribution"
        onChange={onAttributionDraftChange}
      />
    </fieldset>
  );
}
