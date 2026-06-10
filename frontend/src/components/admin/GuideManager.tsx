import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  addPlaceToGuide,
  createGuide,
  getAdminGuide,
  removePlaceFromGuide,
  updateGuide,
  type Guide,
  type GuideDetail,
  type GuidePayload,
  type GuideStatus,
  type Place,
} from "../../api/client";

type Props = {
  guides: Guide[];
  places: Place[];
  onChanged: () => Promise<void>;
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

export function GuideManager({ guides, places, onChanged }: Props) {
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guideDetail, setGuideDetail] = useState<GuideDetail | null>(null);
  const [placeId, setPlaceId] = useState("");
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState("0");
  const [status, setStatus] = useState<GuideStatus>("draft");
  const [title, setTitle] = useState("");
  const selectedGuide = guides.find((guide) => guide.id === selectedGuideId) ?? null;
  const generatedSlug = useMemo(() => slugify(title), [title]);
  const availablePlaces = places.filter((place) => place.status !== "archived");

  useEffect(() => {
    if (!selectedGuide) {
      setDescription("");
      setGuideDetail(null);
      setStatus("draft");
      setTitle("");
      return;
    }

    setDescription(selectedGuide.description ?? "");
    setStatus(selectedGuide.status);
    setTitle(selectedGuide.title);
    getAdminGuide(selectedGuide.id)
      .then(setGuideDetail)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Nie udało się pobrać przewodnika.");
      });
  }, [selectedGuide]);

  async function refreshGuideDetail(guideId: string) {
    const detail = await getAdminGuide(guideId);
    setGuideDetail(detail);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const payload: GuidePayload = {
      slug: selectedGuide?.slug ?? generatedSlug,
      title,
      description: description.trim() || null,
      status,
    };

    try {
      const savedGuide = selectedGuide ? await updateGuide(selectedGuide.id, payload) : await createGuide(payload);
      setSelectedGuideId(savedGuide.id);
      await onChanged();
      await refreshGuideDetail(savedGuide.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udało się zapisać przewodnika.");
    }
  }

  async function handleAddPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGuide || !placeId) {
      return;
    }
    setError(null);
    try {
      const detail = await addPlaceToGuide(selectedGuide.id, {
        place_id: placeId,
        sort_order: Number(sortOrder),
      });
      setGuideDetail(detail);
      setPlaceId("");
      setSortOrder("0");
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udało się dodać miejsca.");
    }
  }

  async function handleRemovePlace(nextPlaceId: string) {
    if (!selectedGuide) {
      return;
    }
    setError(null);
    try {
      const detail = await removePlaceFromGuide(selectedGuide.id, nextPlaceId);
      setGuideDetail(detail);
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udało się usunąć miejsca z przewodnika.");
    }
  }

  return (
    <section className="admin-layout admin-section">
      <div className="admin-editor">
        <h2>{selectedGuide ? "Edytuj przewodnik" : "Dodaj przewodnik"}</h2>
        {error ? <p className="notice error">{error}</p> : null}
        <form className="admin-form" onSubmit={handleSubmit}>
          <label>
            Edycja
            <select value={selectedGuideId} onChange={(event) => setSelectedGuideId(event.target.value)}>
              <option value="">Nowy przewodnik</option>
              {guides.map((guide) => (
                <option value={guide.id} key={guide.id}>
                  {guide.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tytuł
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            Opis
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as GuideStatus)}>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <button type="submit" disabled={!title.trim() || (!selectedGuide && !generatedSlug)}>
            Zapisz przewodnik
          </button>
        </form>

        {selectedGuide ? (
          <form className="admin-form compact-admin-form" onSubmit={handleAddPlace}>
            <label>
              Dodaj miejsce
              <select value={placeId} onChange={(event) => setPlaceId(event.target.value)}>
                <option value="">Wybierz miejsce</option>
                {availablePlaces.map((place) => (
                  <option value={place.id} key={place.id}>
                    {place.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kolejność
              <input type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
            </label>
            <button type="submit" disabled={!placeId}>
              Dodaj do przewodnika
            </button>
          </form>
        ) : null}
      </div>

      <div className="admin-list">
        <div className="place-table" role="table">
          <div className="table-row table-head" role="row">
            <span>Nazwa</span>
            <span>Status</span>
            <span>Akcje</span>
          </div>
          {guideDetail?.places.map((place) => (
            <div className="table-row" role="row" key={place.id}>
              <span>{place.title}</span>
              <span>{place.status}</span>
              <span className="table-actions">
                <button className="secondary-button" type="button" onClick={() => handleRemovePlace(place.id)}>
                  Usuń
                </button>
              </span>
            </div>
          ))}
          {!guideDetail ? <p className="notice">Wybierz przewodnik, żeby zarządzać miejscami.</p> : null}
        </div>
      </div>
    </section>
  );
}
