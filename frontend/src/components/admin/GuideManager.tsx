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
import { ErrorModal, errorDetails, type OperationError } from "../ui/ErrorModal";
import { SystemModal } from "./SystemModal";

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
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [guideDetail, setGuideDetail] = useState<GuideDetail | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isGuideSaving, setIsGuideSaving] = useState(false);
  const [isGuideDetailLoading, setIsGuideDetailLoading] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [placeId, setPlaceId] = useState("");
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState("0");
  const [status, setStatus] = useState<GuideStatus>("draft");
  const [title, setTitle] = useState("");
  const selectedGuide = guides.find((guide) => guide.id === selectedGuideId) ?? null;
  const generatedSlug = useMemo(() => slugify(title), [title]);
  const guideStatusCounts = useMemo(
    () => ({
      archived: guides.filter((guide) => guide.status === "archived").length,
      draft: guides.filter((guide) => guide.status === "draft").length,
      published: guides.filter((guide) => guide.status === "published").length,
    }),
    [guides],
  );
  const availablePlaces = places.filter((place) => place.status !== "archived");

  useEffect(() => {
    if (!selectedGuideId) {
      setGuideDetail(null);
      return;
    }

    setGuideDetail(null);
    setIsGuideDetailLoading(true);
    getAdminGuide(selectedGuideId)
      .then(setGuideDetail)
      .catch((reason: unknown) => {
        setOperationError({
          details: errorDetails(reason),
          message: "Nie udało się pobrać szczegółów przewodnika. Spróbuj ponownie.",
          title: "Nie udało się pobrać przewodnika",
        });
      })
      .finally(() => {
        setIsGuideDetailLoading(false);
      });
  }, [selectedGuideId]);

  async function refreshGuideDetail(guideId: string) {
    const detail = await getAdminGuide(guideId);
    setGuideDetail(detail);
  }

  function resetGuideForm() {
    setDescription("");
    setEditingGuide(null);
    setStatus("draft");
    setTitle("");
  }

  function openCreateGuideModal() {
    resetGuideForm();
    setIsGuideModalOpen(true);
  }

  function openEditGuideModal(guide: Guide) {
    setDescription(guide.description ?? "");
    setEditingGuide(guide);
    setStatus(guide.status);
    setTitle(guide.title);
    setIsGuideModalOpen(true);
  }

  function handleCloseGuideModal() {
    if (isGuideSaving) {
      return;
    }
    setIsGuideModalOpen(false);
    resetGuideForm();
  }

  async function handleSaveGuide() {
    if (!title.trim() || (!editingGuide && !generatedSlug)) {
      return;
    }

    setOperationError(null);
    setIsGuideSaving(true);
    const payload: GuidePayload = {
      slug: editingGuide?.slug ?? generatedSlug,
      title,
      description: description.trim() || null,
      status,
    };

    try {
      const savedGuide = editingGuide ? await updateGuide(editingGuide.id, payload) : await createGuide(payload);
      setSelectedGuideId(savedGuide.id);
      setIsGuideModalOpen(false);
      resetGuideForm();
      await onChanged();
      await refreshGuideDetail(savedGuide.id);
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zapisać przewodnika. Sprawdź dane i spróbuj ponownie.",
        title: "Nie udało się zapisać przewodnika",
      });
    } finally {
      setIsGuideSaving(false);
    }
  }

  async function handleAddPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGuide || !placeId) {
      return;
    }
    setOperationError(null);
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
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się dodać miejsca do przewodnika. Spróbuj ponownie.",
        title: "Nie udało się dodać miejsca",
      });
    }
  }

  async function handleRemovePlace(nextPlaceId: string) {
    if (!selectedGuide) {
      return;
    }
    setOperationError(null);
    try {
      const detail = await removePlaceFromGuide(selectedGuide.id, nextPlaceId);
      setGuideDetail(detail);
      await onChanged();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się usunąć miejsca z przewodnika. Spróbuj ponownie.",
        title: "Nie udało się usunąć miejsca",
      });
    }
  }

  return (
    <section className="admin-section admin-section-single guide-manager">
      <div className="guide-toolbar">
        <div className="admin-summary-pills" aria-label="Status przewodników">
          <span>Wszystkie {guides.length}</span>
          <span>Opublikowane {guideStatusCounts.published}</span>
          <span>Szkice {guideStatusCounts.draft}</span>
          <span>Archiwalne {guideStatusCounts.archived}</span>
        </div>
        <button type="button" onClick={openCreateGuideModal}>
          Dodaj przewodnik
        </button>
      </div>

      <div className="guide-list">
        {guides.map((guide) => {
          const isExpanded = selectedGuideId === guide.id;
          return (
            <article className={isExpanded ? "guide-row is-expanded" : "guide-row"} key={guide.id}>
              <div className="guide-row-summary">
                <div>
                  <strong>{guide.title}</strong>
                  <span>{guide.slug}</span>
                </div>
                <span className={`status-badge status-badge--${guide.status}`}>{guide.status}</span>
                <div className="guide-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setSelectedGuideId((currentGuideId) => (currentGuideId === guide.id ? "" : guide.id));
                      setPlaceId("");
                      setSortOrder("0");
                    }}
                  >
                    {isExpanded ? "Zwiń miejsca" : "Miejsca"}
                  </button>
                  <button type="button" onClick={() => openEditGuideModal(guide)}>
                    Edytuj
                  </button>
                </div>
              </div>
              {isExpanded ? (
                <div className="guide-detail-panel">
                  <form className="guide-place-form" onSubmit={handleAddPlace}>
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
                    <button type="submit" disabled={!placeId || !selectedGuide}>
                      Dodaj do przewodnika
                    </button>
                  </form>
                  <div className="guide-place-list">
                    {isGuideDetailLoading ? <p className="notice">Ładowanie miejsc przewodnika.</p> : null}
                    {!isGuideDetailLoading && guideDetail?.places.length === 0 ? (
                      <p className="notice">Ten przewodnik nie ma jeszcze miejsc.</p>
                    ) : null}
                    {!isGuideDetailLoading
                      ? guideDetail?.places.map((place) => (
                          <div className="guide-place-row" key={place.id}>
                            <div>
                              <strong>{place.title}</strong>
                              <span>{place.status}</span>
                            </div>
                            <button className="secondary-button" type="button" onClick={() => handleRemovePlace(place.id)}>
                              Usuń
                            </button>
                          </div>
                        ))
                      : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
        {guides.length === 0 ? <p className="notice">Brak przewodników. Dodaj pierwszy przewodnik przyciskiem powyżej.</p> : null}
      </div>

      {isGuideModalOpen ? (
        <SystemModal
          cancelLabel="Zamknij"
          confirmDisabled={!title.trim() || (!editingGuide && !generatedSlug)}
          confirmLabel={editingGuide ? "Zapisz przewodnik" : "Dodaj przewodnik"}
          eyebrow="Przewodniki"
          isBusy={isGuideSaving}
          title={editingGuide ? "Edytuj przewodnik" : "Dodaj przewodnik"}
          onClose={handleCloseGuideModal}
          onConfirm={handleSaveGuide}
        >
          <div className="guide-form guide-form--modal">
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
          </div>
        </SystemModal>
      ) : null}
      {operationError ? <ErrorModal {...operationError} onClose={() => setOperationError(null)} /> : null}
    </section>
  );
}
