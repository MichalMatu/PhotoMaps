import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlaceMapItem } from "../../api/types";
import { TtsProvider } from "../ui/TtsProvider";
import { PhotoDetailModal } from "./PhotoDetailModal";
import type { PlaceMapVisualItem } from "./placePreview";

vi.mock("../ui/SystemModal", () => ({
  SystemModal: (props: { children?: ReactNode; headerActions?: ReactNode; title: string }) => (
    <div data-title={props.title}>
      <div data-testid="header-actions">{props.headerActions}</div>
      {props.children}
    </div>
  ),
}));

vi.mock("./usePhotoDetailMemory", () => ({
  usePhotoDetailMemory: () => ({
    memoryOwnerTools: {
      operationError: null,
      setOperationError: vi.fn(),
    },
    memorySource: null,
  }),
}));

const noop = () => undefined;

const place: PlaceMapItem = {
  categories: [
    {
      description: null,
      icon: "landmark",
      id: "castle",
      label: "Zamek",
      sort_order: 1,
      status: "active",
    },
  ],
  category_ids: ["castle"],
  city: {
    default_zoom: 13,
    id: "walbrzych",
    lat: 50.7714,
    lon: 16.2843,
    name: "Wałbrzych",
    region: "Dolnośląskie",
    sort_order: 1,
    status: "active",
  },
  city_id: "walbrzych",
  cover_photo: null,
  custom_fields: {},
  description: "Największy zamek Dolnego Śląska.",
  id: "zamek-ksiaz",
  lat: 50.8421,
  lon: 16.2925,
  memory_count: 0,
  photo_count: 1,
  preview_items: [],
  score: 3,
  slug: "zamek-ksiaz",
  title: "Zamek Książ",
  weight: 3,
};

function photoItem(overrides: Partial<PlaceMapVisualItem> = {}): PlaceMapVisualItem {
  return {
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: "Zamek Książ ponad zielenią",
    description_blocks: [{ type: "paragraph", text: "Zamek Książ widziany ponad zielenią wąwozu Pełcznicy." }],
    id: "photo-ksiaz",
    kind: "photo",
    public_path: "/media/ksiaz.jpg",
    thumb_path: "/media/ksiaz-thumb.jpg",
    ...overrides,
  };
}

function stubSpeechSynthesis() {
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

function renderModal(item: PlaceMapVisualItem) {
  return renderToStaticMarkup(
    <TtsProvider>
      <PhotoDetailModal
        customFieldDefinitions={[]}
        isAudioAutoplayEnabled={false}
        item={item}
        place={place}
        onClose={noop}
        onReport={noop}
      />
    </TtsProvider>,
  );
}

describe("PhotoDetailModal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders description and TTS actions for a photo with description", () => {
    stubSpeechSynthesis();

    const markup = renderModal(photoItem());

    expect(markup).toContain('aria-label="Pokaż opis zdjęcia"');
    expect(markup).toContain('aria-label="Odczytaj opis zdjęcia"');
    expect(markup).toContain("tts-button--icon");
  });

  it("does not render photo description actions when the photo has no description", () => {
    stubSpeechSynthesis();

    const markup = renderModal(photoItem({ description_blocks: [] }));

    expect(markup).not.toContain("Pokaż opis zdjęcia");
    expect(markup).not.toContain("Odczytaj opis zdjęcia");
  });
});
