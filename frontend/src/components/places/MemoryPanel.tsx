import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlaceMemories, mediaUrl, uploadPlaceMemory } from "../../api/client";

type Props = {
  claimToken: string;
  onUploaded?: () => void;
  placeId: string;
  showHeading?: boolean;
};

const CONSENT_TEXT =
  "Potwierdzam, że jestem autorem zdjęcia albo mam prawo je opublikować. Jeśli na zdjęciu są rozpoznawalne osoby jako główny temat, mam ich zgodę.";
const CLAIM_TOKEN_MIN_LENGTH = 8;
const MEMORY_AUTHOR_MAX_LENGTH = 40;
const MEMORY_CAPTION_MAX_LENGTH = 80;
const MEMORY_TEXT_MAX_LENGTH = 240;

export function MemoryPanel({ claimToken, onUploaded, placeId, showHeading = true }: Props) {
  const queryClient = useQueryClient();
  const [authorCity, setAuthorCity] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [memoryText, setMemoryText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const memoriesQuery = useQuery({
    queryKey: ["place-memories", placeId],
    queryFn: () => getPlaceMemories(placeId),
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCaption = caption.trim();
    const normalizedMemoryText = memoryText.trim();
    const isAuthorNameValid = authorName.trim().length <= MEMORY_AUTHOR_MAX_LENGTH;
    const isAuthorCityValid = authorCity.trim().length <= MEMORY_AUTHOR_MAX_LENGTH;

    if (
      !file ||
      !normalizedCaption ||
      normalizedCaption.length > MEMORY_CAPTION_MAX_LENGTH ||
      !normalizedMemoryText ||
      normalizedMemoryText.length > MEMORY_TEXT_MAX_LENGTH ||
      !isAuthorNameValid ||
      !isAuthorCityValid ||
      claimToken.trim().length < CLAIM_TOKEN_MIN_LENGTH ||
      !hasConsent
    ) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await uploadPlaceMemory(placeId, {
        authorCity,
        authorName,
        caption,
        claimToken,
        consentConfirmed: hasConsent,
        file,
        memoryText,
      });
      setAuthorCity("");
      setAuthorName("");
      setCaption("");
      setFile(null);
      setHasConsent(false);
      setMemoryText("");
      await queryClient.invalidateQueries({ queryKey: ["place-memories", placeId] });
      await queryClient.invalidateQueries({ queryKey: ["places-map"] });
      onUploaded?.();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Nie udało się wysłać pamiątki.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="memory-panel">
      {showHeading ? (
        <div className="section-heading compact-heading">
          <h3>Byłem tutaj</h3>
          <span>{memoriesQuery.data?.length ?? 0}</span>
        </div>
      ) : null}
      {memoriesQuery.isLoading ? <p className="inline-status">Ładowanie pamiątek...</p> : null}
      <div className="memory-list">
        {memoriesQuery.data?.map((memory) => (
          <article className="memory-card" key={memory.id}>
            <img src={mediaUrl(memory.thumb_path)} alt={memory.caption} />
            <div>
              <strong>{memory.author_name ?? "Gość"}</strong>
              {memory.author_city ? <span>{memory.author_city}</span> : null}
              <p>{memory.caption}</p>
              <p className="memory-card-note">{memory.memory_text}</p>
            </div>
          </article>
        ))}
      </div>
      <form className="photo-upload" onSubmit={handleSubmit}>
        <label>
          Zdjęcie pamiątki
          <input accept="image/*" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label>
          Podpis
          <input
            maxLength={MEMORY_CAPTION_MAX_LENGTH}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            required
          />
        </label>
        <label>
          Myśl / wspomnienie
          <textarea
            maxLength={MEMORY_TEXT_MAX_LENGTH}
            rows={3}
            value={memoryText}
            onChange={(event) => setMemoryText(event.target.value)}
            required
          />
          <span className="field-limit">{memoryText.trim().length}/{MEMORY_TEXT_MAX_LENGTH}</span>
        </label>
        <div className="field-row">
          <label>
            Imię
            <input
              maxLength={MEMORY_AUTHOR_MAX_LENGTH}
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
            />
          </label>
          <label>
            Miasto
            <input
              maxLength={MEMORY_AUTHOR_MAX_LENGTH}
              value={authorCity}
              onChange={(event) => setAuthorCity(event.target.value)}
            />
          </label>
        </div>
        <label className="checkbox-field consent-field">
          <input checked={hasConsent} type="checkbox" onChange={(event) => setHasConsent(event.target.checked)} />
          {CONSENT_TEXT}
        </label>
        <button
          type="submit"
          disabled={
            !file ||
            !caption.trim() ||
            !memoryText.trim() ||
            claimToken.trim().length < CLAIM_TOKEN_MIN_LENGTH ||
            !hasConsent ||
            isSaving
          }
        >
          {isSaving ? "Wysyłanie..." : "Dodaj pamiątkę"}
        </button>
        {message ? <p className="inline-status inline-status--error">{message}</p> : null}
      </form>
    </section>
  );
}
