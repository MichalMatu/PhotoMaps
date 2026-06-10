import { FormEvent, useState } from "react";

import { uploadPlacePhoto } from "../../api/client";

type Props = {
  placeId: string;
  onUploaded?: () => void;
};

const CONSENT_TEXT =
  "Potwierdzam, że jestem autorem zdjęcia albo mam prawo je opublikować. Jeśli na zdjęciu są rozpoznawalne osoby jako główny temat, mam ich zgodę.";

export function PhotoUploadForm({ placeId, onUploaded }: Props) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !hasConsent) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await uploadPlacePhoto(placeId, file, caption);
      setCaption("");
      setFile(null);
      setHasConsent(false);
      setMessage("Zdjęcie trafiło do moderacji.");
      onUploaded?.();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Nie udało się wysłać zdjęcia.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="photo-upload" onSubmit={handleSubmit}>
      <label>
        Zdjęcie
        <input
          accept="image/*"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <label>
        Podpis
        <input value={caption} onChange={(event) => setCaption(event.target.value)} />
      </label>
      <label className="checkbox-field consent-field">
        <input
          checked={hasConsent}
          type="checkbox"
          onChange={(event) => setHasConsent(event.target.checked)}
        />
        {CONSENT_TEXT}
      </label>
      <button type="submit" disabled={!file || !hasConsent || isSaving}>
        {isSaving ? "Wysyłanie..." : "Dodaj zdjęcie"}
      </button>
      {message ? <p className="inline-status">{message}</p> : null}
    </form>
  );
}
