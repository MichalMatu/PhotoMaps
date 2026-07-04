import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlaceMemories } from "../../api/media";
import { ErrorModal } from "../ui/ErrorModal";
import { MemoryList } from "./MemoryList";
import { getMemoryPanelVisibility, type MemoryPanelMode } from "./memoryPanelMode";
import { MemoryUploadForm } from "./MemoryUploadForm";
import { useMemoryUploadForm } from "./useMemoryUploadForm";

type Props = {
  claimToken: string;
  mode?: MemoryPanelMode;
  onUploaded?: () => void;
  placeId: string;
};

export function MemoryPanel({ claimToken, mode = "with-list", onUploaded, placeId }: Props) {
  const queryClient = useQueryClient();
  const visibility = getMemoryPanelVisibility(mode);
  const form = useMemoryUploadForm({ claimToken, onUploaded, placeId, queryClient });
  const memoriesQuery = useQuery({
    enabled: visibility.loadExistingMemories,
    queryKey: ["place-memories", placeId],
    queryFn: () => getPlaceMemories(placeId),
  });

  return (
    <section className="memory-panel">
      {visibility.showHeading ? (
        <div className="section-heading compact-heading">
          <h3>Byłem tutaj</h3>
          <span>{memoriesQuery.data?.length ?? 0}</span>
        </div>
      ) : null}
      {visibility.showExistingMemories && memoriesQuery.isLoading ? (
        <p className="inline-status">Ładowanie pamiątek...</p>
      ) : null}
      {visibility.showExistingMemories ? <MemoryList memories={memoriesQuery.data} /> : null}
      <MemoryUploadForm
        audioFile={form.audioFile}
        authorCity={form.authorCity}
        authorName={form.authorName}
        caption={form.caption}
        fieldErrors={form.fieldErrors}
        file={form.file}
        fileInputKey={form.fileInputKey}
        hasConsent={form.hasConsent}
        isSaving={form.isSaving}
        isSubmitDisabled={form.isSubmitDisabled}
        memoryText={form.memoryText}
        onAudioFileChange={form.setAudioFile}
        onAuthorCityChange={form.setAuthorCity}
        onAuthorNameChange={form.setAuthorName}
        onCaptionChange={form.setCaption}
        onConsentChange={form.setHasConsent}
        onFileChange={form.setFile}
        onMemoryTextChange={form.setMemoryText}
        onSubmit={form.handleSubmit}
      />
      {form.operationError ? (
        <ErrorModal {...form.operationError} onClose={() => form.setOperationError(null)} />
      ) : null}
    </section>
  );
}
