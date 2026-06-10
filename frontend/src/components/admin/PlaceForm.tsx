import { FormEvent, useEffect, useMemo, useState } from "react";

import type { Category, Place, PlacePayload, PlaceStatus } from "../../api/client";
import { PlaceLocationPicker } from "./PlaceLocationPicker";

type Props = {
  categories: Category[];
  place?: Place | null;
  onCancel?: () => void;
  onSubmit: (payload: PlacePayload) => Promise<void>;
};

const INITIAL_LOCATION = {
  lat: 51.1079,
  lon: 17.0385,
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PlaceForm({ categories, onCancel, onSubmit, place }: Props) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState(INITIAL_LOCATION);
  const [description, setDescription] = useState("");
  const [localComment, setLocalComment] = useState("");
  const [weight, setWeight] = useState("1");
  const [status, setStatus] = useState<PlaceStatus>("draft");
  const [isChain, setIsChain] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const generatedSlug = useMemo(() => slugify(title), [title]);
  const availableCategories = useMemo(
    () => categories.filter((category) => category.status === "active" || category.id === place?.category_id),
    [categories, place?.category_id],
  );

  useEffect(() => {
    if (!place) {
      setTitle("");
      setCategoryId("");
      setLocation(INITIAL_LOCATION);
      setDescription("");
      setLocalComment("");
      setWeight("1");
      setStatus("draft");
      setIsChain(false);
      return;
    }

    setTitle(place.title);
    setCategoryId(place.category_id ?? "");
    setLocation({ lat: place.lat, lon: place.lon });
    setDescription(place.description ?? "");
    setLocalComment(place.local_comment ?? "");
    setWeight(String(place.weight));
    setStatus(place.status);
    setIsChain(place.is_chain);
  }, [place]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        slug: place?.slug ?? generatedSlug,
        title,
        category_id: categoryId || null,
        lat: location.lat,
        lon: location.lon,
        description: description.trim() || null,
        local_comment: localComment.trim() || null,
        weight: Number(weight),
        status,
        is_chain: isChain,
      });
      if (!place) {
        setTitle("");
        setCategoryId("");
        setLocation(INITIAL_LOCATION);
        setDescription("");
        setLocalComment("");
        setWeight("1");
        setStatus("draft");
        setIsChain(false);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label>
        Nazwa
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>

      <label>
        Kategoria
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Bez kategorii</option>
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>

      <div className="location-field">
        <span>Lokalizacja</span>
        <PlaceLocationPicker position={location} onChange={setLocation} />
      </div>

      <label>
        Opis
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
      </label>

      <label>
        Lokalny komentarz
        <textarea value={localComment} onChange={(event) => setLocalComment(event.target.value)} rows={3} />
      </label>

      <div className="field-row">
        <label>
          Priorytet redakcji
          <input
            min="0.5"
            max="3"
            step="0.5"
            type="number"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as PlaceStatus)}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </div>

      <label className="checkbox-field">
        <input type="checkbox" checked={isChain} onChange={(event) => setIsChain(event.target.checked)} />
        Sieciowka
      </label>

      <button type="submit" disabled={!generatedSlug || isSaving}>
        {isSaving ? "Zapisywanie..." : place ? "Zapisz zmiany" : "Dodaj miejsce"}
      </button>
      {place ? (
        <button className="ghost-button" type="button" onClick={onCancel}>
          Anuluj edycję
        </button>
      ) : null}
    </form>
  );
}
