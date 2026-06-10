import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlaceMemories, mediaUrl, uploadPlaceMemory } from "../../api/client";

type Props = {
  placeId: string;
};

const CONSENT_TEXT =
  "Potwierdzam, że jestem autorem zdjęcia albo mam prawo je opublikować. Jeśli na zdjęciu są rozpoznawalne osoby jako główny temat, mam ich zgodę.";

export function MemoryPanel({ placeId }: Props) {
  const queryClient = useQueryClient();
  const [authorCity, setAuthorCity] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const memoriesQuery = useQuery({
    queryKey: ["place-memories", placeId],
    queryFn: () => getPlaceMemories(placeId),
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !caption.trim() || !hasConsent) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await uploadPlaceMemory(placeId, {
        authorCity,
        authorName,
        caption,
        consentConfirmed: hasConsent,
        file,
      });
      setAuthorCity("");
      setAuthorName("");
      setCaption("");
      setFile(null);
      setHasConsent(false);
      setMessage("Pamiątka trafiła do moderacji.");
      await queryClient.invalidateQueries({ queryKey: ["place-memories", placeId] });
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Nie udało się wysłać pamiątki.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="memory-panel">
      <div className="section-heading compact-heading">
        <h3>Byłem tutaj</h3>
        <span>{memoriesQuery.data?.length ?? 0}</span>
      </div>
      {memoriesQuery.isLoading ? <p className="inline-status">Ładowanie pamiątek...</p> : null}
      <div className="memory-list">
        {memoriesQuery.data?.map((memory) => (
          <article className="memory-card" key={memory.id}>
            <img src={mediaUrl(memory.thumb_path)} alt={memory.caption} />
            <div>
              <strong>{memory.author_name ?? "Gość"}</strong>
              {memory.author_city ? <span>{memory.author_city}</span> : null}
              <p>{memory.caption}</p>
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
          <input value={caption} onChange={(event) => setCaption(event.target.value)} required />
        </label>
        <div className="field-row">
          <label>
            Imię
            <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} />
          </label>
          <label>
            Miasto
            <input value={authorCity} onChange={(event) => setAuthorCity(event.target.value)} />
          </label>
        </div>
        <label className="checkbox-field consent-field">
          <input checked={hasConsent} type="checkbox" onChange={(event) => setHasConsent(event.target.checked)} />
          {CONSENT_TEXT}
        </label>
        <button type="submit" disabled={!file || !caption.trim() || !hasConsent || isSaving}>
          {isSaving ? "Wysyłanie..." : "Dodaj pamiątkę"}
        </button>
        {message ? <p className="inline-status">{message}</p> : null}
      </form>
    </section>
  );
}
