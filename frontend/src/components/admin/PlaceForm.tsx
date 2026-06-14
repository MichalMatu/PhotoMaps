import { FormEvent, useEffect, useMemo, useState } from "react";

import type { Category, City, Place, PlaceStatus } from "../../api/client";
import {
  DEFAULT_PLACE_PRIORITY,
  MAX_PLACE_PRIORITY,
  MIN_PLACE_PRIORITY,
  PLACE_PRIORITY_STEP,
} from "../../config/placePriority";
import { PHOTO_CAPTION_MAX_LENGTH } from "./adminMediaUi";
import { LocationPicker } from "./LocationPicker";
import type { PlaceFormPayload } from "./useAdminPlaceManagement";

type Props = {
  categories: Category[];
  cities: City[];
  className?: string;
  place?: Place | null;
  secondaryAction?: {
    detail?: string;
    label: string;
    onClick: () => void;
  };
  onCancel?: () => void;
  onSubmit: (payload: PlaceFormPayload) => Promise<void>;
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

export function PlaceForm({
  categories,
  cities,
  className = "ui-form admin-form",
  onCancel,
  onSubmit,
  place,
  secondaryAction,
}: Props) {
  const [title, setTitle] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [location, setLocation] = useState(INITIAL_LOCATION);
  const [description, setDescription] = useState("");
  const [localComment, setLocalComment] = useState("");
  const [weight, setWeight] = useState(String(DEFAULT_PLACE_PRIORITY));
  const [status, setStatus] = useState<PlaceStatus>("draft");
  const [coverPhotoCaption, setCoverPhotoCaption] = useState("");
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoInputKey, setCoverPhotoInputKey] = useState(0);
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
  const selectedCityName = availableCities.find((city) => city.id === cityId)?.name ?? cityId;

  useEffect(() => {
    if (!place) {
      setTitle("");
      setCityId(defaultCityId);
      setCategoryIds([]);
      setLocation(INITIAL_LOCATION);
      setDescription("");
      setLocalComment("");
      setWeight(String(DEFAULT_PLACE_PRIORITY));
      setStatus("draft");
      setCoverPhotoCaption("");
      setCoverPhotoFile(null);
      setCoverPhotoInputKey((currentKey) => currentKey + 1);
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
    setCoverPhotoCaption("");
    setCoverPhotoFile(null);
    setCoverPhotoInputKey((currentKey) => currentKey + 1);
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
        coverPhotoCaption,
        coverPhotoFile,
      });
      if (!place) {
        setTitle("");
        setCityId(defaultCityId);
        setCategoryIds([]);
        setLocation(INITIAL_LOCATION);
        setDescription("");
        setLocalComment("");
        setWeight(String(DEFAULT_PLACE_PRIORITY));
        setStatus("draft");
        setCoverPhotoCaption("");
        setCoverPhotoFile(null);
        setCoverPhotoInputKey((currentKey) => currentKey + 1);
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
        <LocationPicker mode="modal-only" previewLabel={selectedCityName} position={location} onChange={setLocation} />
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
            type="number"
            min={MIN_PLACE_PRIORITY}
            max={MAX_PLACE_PRIORITY}
            step={PLACE_PRIORITY_STEP}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            required
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

      {!place ? (
        <fieldset className="cover-photo-fieldset">
          <legend>Zdjęcie główne</legend>
          <div className="cover-photo-grid">
            <label>
              Plik
              <input
                accept="image/*"
                key={coverPhotoInputKey}
                type="file"
                onChange={(event) => setCoverPhotoFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              Podpis
              <input
                maxLength={PHOTO_CAPTION_MAX_LENGTH}
                value={coverPhotoCaption}
                onChange={(event) => setCoverPhotoCaption(event.target.value)}
              />
            </label>
          </div>
        </fieldset>
      ) : null}

      <div className="place-form-actions">
        <button type="submit" disabled={!cityId || !generatedSlug || isSaving}>
          {isSaving ? "Zapisywanie..." : place ? "Zapisz zmiany" : "Dodaj miejsce"}
        </button>
        {onCancel ? (
          <button className="ui-button ui-button--ghost" type="button" onClick={onCancel}>
            {place ? "Anuluj edycję" : "Anuluj"}
          </button>
        ) : null}
        {secondaryAction ? (
          <button className="ui-button ui-button--secondary" type="button" onClick={secondaryAction.onClick}>
            <span>{secondaryAction.label}</span>
            {secondaryAction.detail ? <span className="place-form-action-detail">{secondaryAction.detail}</span> : null}
          </button>
        ) : null}
      </div>
    </form>
  );
}
