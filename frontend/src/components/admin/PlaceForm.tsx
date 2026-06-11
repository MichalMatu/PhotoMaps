import { FormEvent, useEffect, useMemo, useState } from "react";

import type { Category, City, Place, PlacePayload, PlaceStatus } from "../../api/client";
import { PlaceLocationPicker } from "./PlaceLocationPicker";

type Props = {
  categories: Category[];
  cities: City[];
  className?: string;
  place?: Place | null;
  onCancel?: () => void;
  onSubmit: (payload: PlacePayload) => Promise<void>;
};

const INITIAL_LOCATION = {
  lat: 51.1079,
  lon: 17.0385,
};

const PRIORITY_OPTIONS = [
  { label: "0.5 - niski priorytet", value: "0.5" },
  { label: "1.0 - normalny priorytet", value: "1" },
  { label: "1.5 - podbity priorytet", value: "1.5" },
  { label: "2.0 - wysoki priorytet", value: "2" },
  { label: "2.5 - bardzo wysoki priorytet", value: "2.5" },
  { label: "3.0 - najwyższy priorytet", value: "3" },
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PlaceForm({ categories, cities, className = "admin-form", onCancel, onSubmit, place }: Props) {
  const [title, setTitle] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [location, setLocation] = useState(INITIAL_LOCATION);
  const [description, setDescription] = useState("");
  const [localComment, setLocalComment] = useState("");
  const [weight, setWeight] = useState("1");
  const [status, setStatus] = useState<PlaceStatus>("draft");
  const [isSaving, setIsSaving] = useState(false);

  const generatedSlug = useMemo(() => slugify(title), [title]);
  const availableCities = useMemo(
    () => cities.filter((city) => city.status === "active" || city.id === place?.city_id),
    [cities, place?.city_id],
  );
  const availableCategories = useMemo(
    () => categories.filter((category) => category.status === "active" || place?.category_ids.includes(category.id)),
    [categories, place?.category_ids],
  );
  const defaultCityId = availableCities[0]?.id ?? "";

  useEffect(() => {
    if (!place) {
      setTitle("");
      setCityId(defaultCityId);
      setCategoryIds([]);
      setLocation(INITIAL_LOCATION);
      setDescription("");
      setLocalComment("");
      setWeight("1");
      setStatus("draft");
      return;
    }

    setTitle(place.title);
    setCityId(place.city_id);
    setCategoryIds(place.category_ids);
    setLocation({ lat: place.lat, lon: place.lon });
    setDescription(place.description ?? "");
    setLocalComment(place.local_comment ?? "");
    setWeight(String(place.weight));
    setStatus(place.status);
  }, [defaultCityId, place]);

  function toggleCategory(categoryId: string) {
    setCategoryIds((currentIds) =>
      currentIds.includes(categoryId)
        ? currentIds.filter((currentId) => currentId !== categoryId)
        : [...currentIds, categoryId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        city_id: cityId,
        slug: place?.slug ?? generatedSlug,
        title,
        category_ids: categoryIds,
        lat: location.lat,
        lon: location.lon,
        description: description.trim() || null,
        local_comment: localComment.trim() || null,
        weight: Number(weight),
        status,
      });
      if (!place) {
        setTitle("");
        setCityId(defaultCityId);
        setCategoryIds([]);
        setLocation(INITIAL_LOCATION);
        setDescription("");
        setLocalComment("");
        setWeight("1");
        setStatus("draft");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      <label>
        Nazwa
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>

      <label>
        Miasto
        <select value={cityId} onChange={(event) => setCityId(event.target.value)} required>
          {availableCities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="category-checkboxes">
        <legend>Kategorie</legend>
        <div className="category-checkbox-grid">
          {availableCategories.map((category) => (
            <label key={category.id}>
              <input
                type="checkbox"
                checked={categoryIds.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
              />
              <span>{category.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
          <select value={weight} onChange={(event) => setWeight(event.target.value)}>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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

      <button type="submit" disabled={!cityId || !generatedSlug || isSaving}>
        {isSaving ? "Zapisywanie..." : place ? "Zapisz zmiany" : "Dodaj miejsce"}
      </button>
      {onCancel ? (
        <button className="ghost-button" type="button" onClick={onCancel}>
          {place ? "Anuluj edycję" : "Anuluj"}
        </button>
      ) : null}
    </form>
  );
}
