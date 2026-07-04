import { useState } from "react";

import type { AudioAttachment } from "../../api/types";
import { AUDIO_FILE_ACCEPT, validateAudioFile } from "../ui/audioAttachment";
import { AudioAttachmentPlayer } from "../ui/AudioAttachmentPlayer";
import { FileInputControl } from "../ui/FileInputControl";

type Props = {
  audio: AudioAttachment | null;
  disabled?: boolean;
  inputKeyPrefix: string;
  onDeleteAudio: () => Promise<void>;
  onError: (message: string | null) => void;
  onSaveAudio: (file: File) => Promise<void>;
};

export function AdminAudioControls({
  audio,
  disabled = false,
  inputKeyPrefix,
  onDeleteAudio,
  onError,
  onSaveAudio,
}: Props) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const audioError = validateAudioFile(audioFile);
  const isBusy = disabled || isDeleting || isSaving;
  const canSave = Boolean(audioFile) && !audioError && !isBusy;

  function resetFile() {
    setAudioFile(null);
    setInputKey((currentKey) => currentKey + 1);
  }

  async function handleSaveAudio() {
    if (!audioFile) {
      return;
    }
    const nextAudioError = validateAudioFile(audioFile);
    if (nextAudioError) {
      onError(nextAudioError);
      return;
    }

    setIsSaving(true);
    onError(null);
    try {
      await onSaveAudio(audioFile);
      resetFile();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Nie udało się zapisać audio.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAudio() {
    if (!audio) {
      return;
    }

    setIsDeleting(true);
    onError(null);
    try {
      await onDeleteAudio();
      resetFile();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Nie udało się usunąć audio.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="admin-audio-controls">
      <AudioAttachmentPlayer audio={audio} />
      <label>
        Audio
        <FileInputControl
          accept={AUDIO_FILE_ACCEPT}
          file={audioFile}
          inputKey={`${inputKeyPrefix}-${inputKey}`}
          isInvalid={Boolean(audioError)}
          onChange={setAudioFile}
        />
        {audioError ? <span className="field-error">{audioError}</span> : null}
      </label>
      <div className="admin-audio-actions">
        <button className="ui-button ui-button--secondary" disabled={!canSave} type="button" onClick={handleSaveAudio}>
          {isSaving ? "Zapisywanie..." : audio ? "Podmień audio" : "Dodaj audio"}
        </button>
        {audio ? (
          <button className="ui-button ui-button--ghost" disabled={isBusy} type="button" onClick={handleDeleteAudio}>
            {isDeleting ? "Usuwanie..." : "Usuń audio"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
