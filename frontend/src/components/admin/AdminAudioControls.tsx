import { useState } from "react";

import type { AudioAttachment } from "../../api/types";
import { AUDIO_FILE_ACCEPT, validateAudioFile } from "../ui/audioAttachment";
import { FileInputControl } from "../ui/FileInputControl";
import { SettingField } from "../ui/SettingField";
import { AdminAudioPlayer } from "./AdminAuthenticatedMedia";
import { ADMIN_MEDIA_FIELD_HELP } from "./adminMediaFieldHelp";

type Props = {
  audio: AudioAttachment | null;
  disabled?: boolean;
  inputKeyPrefix: string;
  mode?: "default" | "compact";
  onDeleteAudio: () => Promise<void>;
  onError: (message: string | null) => void;
  onSaveAudio: (file: File) => Promise<void>;
};

export function AdminAudioControls({
  audio,
  disabled = false,
  inputKeyPrefix,
  mode = "default",
  onDeleteAudio,
  onError,
  onSaveAudio,
}: Props) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const audioError = validateAudioFile(audioFile);
  const audioErrorId = `${inputKeyPrefix}-error`;
  const isBusy = disabled || isDeleting || isSaving;
  const canSave = Boolean(audioFile) && !audioError && !isBusy;
  const isCompact = mode === "compact";

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
    <div className={isCompact ? "admin-audio-controls admin-audio-controls--compact" : "admin-audio-controls"}>
      <AdminAudioPlayer audio={audio} />
      <SettingField
        id={`${inputKeyPrefix}-field`}
        label="Audio"
        hint={isCompact ? undefined : ADMIN_MEDIA_FIELD_HELP["audio-file"]}
        describedByProp="describedBy"
        footer={
          audioError ? (
            <span className="field-error" id={audioErrorId}>
              {audioError}
            </span>
          ) : null
        }
      >
        <FileInputControl
          accept={AUDIO_FILE_ACCEPT}
          describedBy={audioError ? audioErrorId : undefined}
          file={audioFile}
          inputKey={`${inputKeyPrefix}-${inputKey}`}
          isInvalid={Boolean(audioError)}
          onChange={setAudioFile}
        />
      </SettingField>
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
