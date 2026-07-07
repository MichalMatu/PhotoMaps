import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPlacePhotos } from "../../api/media";
import type { Photo, PlaceMapItem, PlaceMapPhoto } from "../../api/types";
import type { PlaceMapVisualItem } from "../map/placePreview";
import { AdminPlacePublicPreviewModal } from "./AdminPlacePublicPreviewModal";

type PhotoDetailModalMockProps = {
  item: PlaceMapVisualItem;
  navigationItems?: PlaceMapVisualItem[];
  onNavigate?: (item: PlaceMapVisualItem) => void;
};

const modalMocks = vi.hoisted(() => ({
  photoDetailProps: [] as unknown[],
}));

vi.mock("../../api/media", () => ({
  getPlacePhotos: vi.fn(),
}));

vi.mock("../map/PhotoDetailModal", () => ({
  PhotoDetailModal: (props: PhotoDetailModalMockProps) => {
    modalMocks.photoDetailProps.push(props);
    return <div data-testid="photo-detail-modal" />;
  },
}));

vi.mock("../map/ReportSheet", () => ({
  ReportSheet: ({ children }: { children?: ReactNode }) => <div data-testid="report-sheet">{children}</div>,
}));

function photo(id: string): Photo {
  return {
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: `Zdjęcie ${id}`,
    description_blocks: [],
    id,
    place_id: "place-1",
    public_path: `/media/${id}.jpg`,
    thumb_path: `/media/${id}-thumb.jpg`,
  };
}

function mapPhoto(id: string): PlaceMapPhoto {
  return {
    ...photo(id),
    approved_at: "2026-01-02T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    role: "gallery",
    source: "editorial",
  };
}

function place(): PlaceMapItem {
  return {
    categories: [
      {
        description: null,
        icon: "landmark",
        id: "classic",
        label: "Lokalny klasyk",
        sort_order: 1,
        status: "active",
      },
    ],
    category_ids: ["classic"],
    city: {
      default_zoom: 13,
      id: "wroclaw",
      lat: 51.1079,
      lon: 17.0385,
      name: "Wrocław",
      region: "Dolnośląskie",
      sort_order: 1,
      status: "active",
    },
    city_id: "wroclaw",
    cover_photo: mapPhoto("photo-cover"),
    custom_fields: {},
    description: "Opis miejsca.",
    id: "place-1",
    lat: 51.1079,
    lon: 17.0385,
    memory_count: 0,
    photo_count: 2,
    preview_items: [],
    score: 4,
    slug: "lokalny-klasyk",
    title: "Lokalny klasyk",
    weight: 2,
  };
}

function renderPreview(currentPlace: PlaceMapItem, queryClient: QueryClient) {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <AdminPlacePublicPreviewModal customFieldDefinitions={[]} place={currentPlace} onClose={() => undefined} />
    </QueryClientProvider>,
  );
}

describe("AdminPlacePublicPreviewModal", () => {
  beforeEach(() => {
    modalMocks.photoDetailProps = [];
    vi.mocked(getPlacePhotos).mockResolvedValue([]);
  });

  it("passes full public photo navigation to the clean preview modal", () => {
    const currentPlace = place();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    queryClient.setQueryData(["place", currentPlace.id, "photos"], [photo("photo-cover"), photo("photo-second")]);

    renderPreview(currentPlace, queryClient);

    const props = modalMocks.photoDetailProps[modalMocks.photoDetailProps.length - 1] as PhotoDetailModalMockProps;
    expect(props.item.id).toBe("photo-cover");
    expect(props.navigationItems?.map((item) => item.id)).toEqual(["photo-cover", "photo-second"]);
    expect(typeof props.onNavigate).toBe("function");
  });
});
