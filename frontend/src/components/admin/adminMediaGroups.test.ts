import { describe, expect, it } from "vitest";

import type { AdminPhoto, Category, City, Place } from "../../api/types";
import {
  groupAdminMediaByPlace,
  groupAdminMediaPlaceGroupsByCity,
  groupAdminPhotoAlbumsByPlace,
  selectPhotoAlbumCover,
} from "./adminMediaGroups";

const category: Category = {
  description: null,
  icon: null,
  id: "shops",
  label: "Sklepy",
  sort_order: 0,
  status: "active",
};

const city: City = {
  default_zoom: 13,
  id: "wroclaw",
  lat: 51.1,
  lon: 17.03,
  name: "Wrocław",
  region: "Dolnośląskie",
  sort_order: 1,
  status: "active",
};

const place: Place = {
  category_ids: ["shops"],
  city_id: "wroclaw",
  cover_photo_id: "photo-2",
  created_at: "2026-06-10T00:00:00",
  description: null,
  id: "place-1",
  lat: 51.1,
  local_comment: null,
  lon: 17.1,
  memory_count: 0,
  photo_count: 2,
  score: 2,
  slug: "sklep",
  status: "published",
  custom_fields: {},
  title: "Sklep",
  updated_at: "2026-06-10T00:00:00",
  weight: 1,
};

function photo(id: string, placeId = "place-1"): AdminPhoto {
  return {
    approved_at: null,
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: null,
    description_blocks: [],
    consent_confirmed: true,
    created_at: "2026-06-10T00:00:00",
    id,
    place_id: placeId,
    public_path: `/media/photos/${id}.jpg`,
    role: "gallery",
    source: "editorial",
    status: "approved",
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

describe("groupAdminMediaByPlace", () => {
  it("groups media by place and exposes the place category label", () => {
    expect(
      groupAdminMediaByPlace([photo("photo-1"), photo("photo-2")], [place], [category], selectPhotoAlbumCover),
    ).toMatchObject([
      {
        categoryLabel: "Sklepy",
        coverItem: { id: "photo-2" },
        itemCount: 2,
        items: [{ id: "photo-1" }, { id: "photo-2" }],
        title: "Sklep",
      },
    ]);
  });

  it("skips media records whose place is no longer available", () => {
    expect(
      groupAdminMediaByPlace([photo("photo-1"), photo("orphan-photo", "deleted-place")], [place], [category]),
    ).toMatchObject([
      {
        items: [{ id: "photo-1" }],
        placeId: "place-1",
        title: "Sklep",
      },
    ]);
  });
});

describe("groupAdminPhotoAlbumsByPlace", () => {
  it("keeps album counts separate from lazily loaded photo items", () => {
    expect(
      groupAdminPhotoAlbumsByPlace(
        [{ cover_photo: photo("photo-1"), photo_count: 7, place_id: place.id }],
        [place],
        [category],
      ),
    ).toMatchObject([
      {
        coverItem: { id: "photo-1" },
        itemCount: 7,
        items: [],
        placeId: "place-1",
      },
    ]);
  });
});

describe("groupAdminMediaPlaceGroupsByCity", () => {
  it("keeps moderation albums grouped by city before place", () => {
    const secondPlace = { ...place, city_id: "legnica", id: "place-2", title: "Rynek Legnica" };
    const placeGroups = groupAdminMediaByPlace(
      [photo("photo-1"), photo("photo-2", "place-2")],
      [place, secondPlace],
      [category],
    );

    expect(
      groupAdminMediaPlaceGroupsByCity(placeGroups, [city, { ...city, id: "legnica", name: "Legnica", sort_order: 2 }]),
    ).toMatchObject([
      {
        cityId: "wroclaw",
        cityName: "Wrocław",
        itemCount: 1,
        placeGroups: [{ placeId: "place-1" }],
      },
      {
        cityId: "legnica",
        cityName: "Legnica",
        itemCount: 1,
        placeGroups: [{ placeId: "place-2" }],
      },
    ]);
  });
});
