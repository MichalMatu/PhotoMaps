import type { ContentBlock, ContentBlockType } from "../../api/types";
import { ContentBlockEditor } from "../content/ContentBlockEditor";
import { AUDIO_FILE_ACCEPT } from "../ui/audioAttachment";
import { FileInputControl } from "../ui/FileInputControl";
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
        <label>
          Plik
          <FileInputControl accept="image/*" file={file} inputKey={`image-${inputKey}`} onChange={onFileChange} />
        </label>
        <label>
          Audio
          <FileInputControl
            accept={AUDIO_FILE_ACCEPT}
            file={audioFile}
            inputKey={`audio-${inputKey}`}
            isInvalid={Boolean(audioError)}
            onChange={onAudioFileChange}
          />
          {audioError ? <span className="field-error">{audioError}</span> : null}
        </label>
        <label>
          Podpis
          <input
            maxLength={PHOTO_CAPTION_MAX_LENGTH}
            value={caption}
            onChange={(event) => onCaptionChange(event.target.value)}
          />
        </label>
      </div>
      <ContentBlockEditor
        blocks={descriptionBlocks}
        legend="Opis zdjęcia"
        onAddBlock={onAddDescriptionBlock}
        onRemoveBlock={onRemoveDescriptionBlock}
        onUpdateBlock={onUpdateDescriptionBlock}
        onUpdateBlockType={onUpdateDescriptionBlockType}
      />
      <PhotoAttributionFields draft={attributionDraft} onChange={onAttributionDraftChange} />
    </fieldset>
  );
}
