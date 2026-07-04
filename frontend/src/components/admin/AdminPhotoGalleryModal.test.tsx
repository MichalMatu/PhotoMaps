import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminPhoto, Place } from "../../api/types";
import { TtsProvider } from "../ui/TtsProvider";
import { AdminPhotoGalleryModal } from "./AdminPhotoGalleryModal";

vi.mock("./SystemModal", () => ({
  SystemModal: ({
    children,
    headerActions,
    isFullscreen,
    title,
    variant,
  }: {
    children?: ReactNode;
    headerActions?: ReactNode;
    isFullscreen?: boolean;
    title: string;
    variant?: string;
  }) => (
    <section data-fullscreen={String(Boolean(isFullscreen))} data-title={title} data-variant={variant}>
      <header>{headerActions}</header>
      {children}
    </section>
  ),
}));

vi.mock("./AdminAudioControls", () => ({
  AdminAudioControls: () => <div>Audio tools</div>,
}));

function place(): Place {
  return {
    category_ids: ["classic"],
    city_id: "wroclaw",
    cover_photo_id: "photo-1",
    created_at: "2026-01-01T00:00:00Z",
    custom_fields: {},
    description: "Opis miejsca.",
    id: "place-1",
    lat: 51.1079,
    local_comment: null,
    lon: 17.0385,
    memory_count: 0,
    photo_count: 2,
    score: 4,
    slug: "lokalny-klasyk",
    status: "published",
    title: "Lokalny klasyk",
    updated_at: "2026-01-01T00:00:00Z",
    weight: 2,
  };
}

function photo(id: string, status: AdminPhoto["status"] = "approved"): AdminPhoto {
  return {
    approved_at: status === "approved" ? "2026-01-02T00:00:00Z" : null,
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: `Zdjęcie ${id}`,
    consent_confirmed: true,
    created_at: "2026-01-01T00:00:00Z",
    description_blocks: [{ type: "paragraph", text: "Długi opis zdjęcia do czytania i TTS." }],
    id,
    place_id: "place-1",
    public_path: `/media/${id}.jpg`,
    role: "gallery",
    source: "editorial",
    status,
    thumb_path: `/media/${id}-thumb.jpg`,
  };
}

function speechSynthesisStub() {
  vi.stubGlobal("window", {
    SpeechSynthesisUtterance: function SpeechSynthesisUtterance() {
      return {};
    },
    speechSynthesis: {
      addEventListener: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [{ default: true, lang: "pl-PL", name: "Polski" }]),
      removeEventListener: vi.fn(),
      resume: vi.fn(),
      speak: vi.fn(),
    },
  });
}

function renderGallery(photos: AdminPhoto[]) {
  return renderToStaticMarkup(
    <TtsProvider>
      <AdminPhotoGalleryModal
        currentPhotoId="photo-1"
        isSettingCover={false}
        photos={photos}
        place={place()}
        onClearCover={() => undefined}
        onClose={() => undefined}
        onCurrentPhotoChange={() => undefined}
        onDeleteAudio={async () => undefined}
        onEditText={() => undefined}
        onError={() => undefined}
        onRedact={() => undefined}
        onRequestDelete={() => undefined}
        onReview={() => undefined}
        onSaveAudio={async () => undefined}
        onSetCover={() => undefined}
      />
    </TtsProvider>,
  );
}

describe("AdminPhotoGalleryModal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an immersive media viewer with moderator tools", () => {
    speechSynthesisStub();

    const markup = renderGallery([photo("photo-1"), photo("photo-2", "pending")]);

    expect(markup).toContain('data-variant="media"');
    expect(markup).toContain('aria-label="Pełny ekran"');
    expect(markup).toContain('aria-label="Pokaż opis zdjęcia"');
    expect(markup).toContain('aria-label="Odczytaj opis zdjęcia"');
    expect(markup).toContain('aria-label="Narzędzia zdjęcia"');
    expect(markup).toContain("Anonimizuj");
    expect(markup).toContain("Ukryj");
    expect(markup).toContain("Zdejmij główne");
    expect(markup).toContain("Poprzednie zdjęcie");
    expect(markup).toContain("Następne zdjęcie");
    expect(markup).toContain("1/2");
  });

  it("keeps long photo description out of the short copy panel", () => {
    const markup = renderGallery([photo("photo-1")]);

    expect(markup).toContain("Zdjęcie photo-1");
    expect(markup).not.toContain("Długi opis zdjęcia do czytania i TTS.");
    expect(markup).not.toContain("Brak opisu zdjęcia");
  });
});
