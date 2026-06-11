import { describe, expect, it } from "vitest";

import type { Place } from "../../api/types";
import {
  getClosedPlaceManagementState,
  getCreatePlaceModalState,
  getEditPlaceModalState,
} from "./useAdminPlaceManagement";

const PLACE: Place = {
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
});
