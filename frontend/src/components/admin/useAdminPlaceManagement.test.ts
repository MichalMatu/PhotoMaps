import { describe, expect, it } from "vitest";

import type { AdminPlace } from "../../api/types";
import {
  getClosedPlaceManagementState,
  getCreatePlaceModalState,
  getEditPlaceModalState,
  placePayloadFromFormPayload,
} from "./useAdminPlaceManagement";

const PLACE: AdminPlace = {
  article_blocks: [],
  category_ids: ["coffee"],
  city_id: "wroclaw",
  cover_photo_id: null,
  created_at: "",
  description: "Opis",
  id: "place-1",
  lat: 51.1,
  local_comment: null,
  lon: 17.03,
  memory_count: 0,
  photo_count: 0,
  score: 0,
  slug: "sklep",
  status: "published",
  custom_fields: {},
  title: "Sklep",
  updated_at: "",
  weight: 1,
};

describe("useAdminPlaceManagement helpers", () => {
  it("returns a clean closed state", () => {
    expect(getClosedPlaceManagementState()).toEqual({
      editingPlace: null,
      isPlaceModalOpen: false,
      placeToArchive: null,
      placeToDelete: null,
    });
  });

  it("opens an empty modal for creating a place", () => {
    expect(getCreatePlaceModalState()).toEqual({
      editingPlace: null,
      isPlaceModalOpen: true,
    });
  });

  it("opens the modal with the selected place for editing", () => {
    expect(getEditPlaceModalState(PLACE)).toEqual({
      editingPlace: PLACE,
      isPlaceModalOpen: true,
    });
  });

  it("strips create-only photo fields before saving a place payload", () => {
    const file = new File(["image"], "place.jpg", { type: "image/jpeg" });

    expect(
      placePayloadFromFormPayload({
        category_ids: ["coffee"],
        city_id: "wroclaw",
        coverPhotoAudioFile: null,
        coverPhotoAttributionDraft: {
          attributionAuthor: "Autor",
          attributionLicense: "CC0",
          attributionLicenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
          attributionSourceUrl: "https://commons.wikimedia.org/wiki/File:Photo.jpg",
        },
        coverPhotoCaption: "Główne",
        coverPhotoDescriptionBlocks: [{ type: "paragraph", text: "Opis zdjęcia" }],
        coverPhotoFile: file,
        description: null,
        article_blocks: [
          { type: "paragraph", text: "Opis pełny" },
          { type: "link", text: "Materiał", url: "https://example.com/material" },
        ],
        lat: 51.1,
        local_comment: null,
        lon: 17.03,
        slug: "nowe",
        status: "draft",
        custom_fields: { opening_hours: "10-18" },
        title: "Nowe",
        weight: 1,
      }),
    ).toEqual({
      category_ids: ["coffee"],
      city_id: "wroclaw",
      description: null,
      article_blocks: [
        { type: "paragraph", text: "Opis pełny" },
        { type: "link", text: "Materiał", url: "https://example.com/material" },
      ],
      lat: 51.1,
      local_comment: null,
      lon: 17.03,
      slug: "nowe",
      status: "draft",
      custom_fields: { opening_hours: "10-18" },
      title: "Nowe",
      weight: 1,
    });
  });
});
