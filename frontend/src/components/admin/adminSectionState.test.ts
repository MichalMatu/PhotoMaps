import { describe, expect, it } from "vitest";

import type { Memory, Photo, Report } from "../../api/types";
import {
  countMemoriesByStatus,
  countPhotosByStatus,
  countReportsByStatus,
  filterMemoriesByStatus,
  filterPhotosByStatus,
  filterReportsByStatus,
} from "./adminSectionState";

const PHOTOS: Photo[] = [
  {
    approved_at: null,
    caption: "a",
    created_at: "",
    id: "1",
    place_id: "p1",
    public_path: "",
    status: "pending",
    thumb_path: "",
  },
  {
    approved_at: "",
    caption: "b",
    created_at: "",
    id: "2",
    place_id: "p1",
    public_path: "",
    status: "approved",
    thumb_path: "",
  },
  {
    approved_at: null,
    caption: "c",
    created_at: "",
    id: "3",
    place_id: "p2",
    public_path: "",
    status: "rejected",
    thumb_path: "",
  },
];

const MEMORIES: Memory[] = [
  {
    approved_at: null,
    author_city: null,
    author_name: null,
    caption: "m1",
    consent_confirmed: true,
    created_at: "",
    id: "1",
    memory_text: "one",
    paid: false,
    place_id: "p1",
    public_path: "",
    share_slug: "one",
    status: "pending",
    thumb_path: "",
  },
  {
    approved_at: "",
    author_city: "Wroclaw",
    author_name: "Ala",
    caption: "m2",
    consent_confirmed: true,
    created_at: "",
    id: "2",
    memory_text: "two",
    paid: false,
    place_id: "p1",
    public_path: "",
    share_slug: "two",
    status: "approved",
    thumb_path: "",
  },
];

const REPORTS: Report[] = [
  { created_at: "", id: "1", message: null, reason: "spam", status: "open", target_id: "p1", target_type: "place" },
  { created_at: "", id: "2", message: "x", reason: "wrong", status: "closed", target_id: "m1", target_type: "memory" },
];

describe("adminSectionState", () => {
  it("filters photos by selected status", () => {
    expect(filterPhotosByStatus(PHOTOS, "all")).toHaveLength(3);
    expect(filterPhotosByStatus(PHOTOS, "approved").map((photo) => photo.id)).toEqual(["2"]);
  });

  it("counts photo statuses for admin tabs", () => {
    expect(countPhotosByStatus(PHOTOS)).toEqual({
      all: 3,
      approved: 1,
      pending: 1,
      rejected: 1,
    });
  });

  it("filters and counts memories independently from photos", () => {
    expect(filterMemoriesByStatus(MEMORIES, "pending").map((memory) => memory.id)).toEqual(["1"]);
    expect(countMemoriesByStatus(MEMORIES)).toEqual({
      all: 2,
      approved: 1,
      pending: 1,
      rejected: 0,
    });
  });

  it("filters and counts reports with open and closed statuses", () => {
    expect(filterReportsByStatus(REPORTS, "closed").map((report) => report.id)).toEqual(["2"]);
    expect(countReportsByStatus(REPORTS)).toEqual({
      all: 2,
      closed: 1,
      open: 1,
    });
  });
});
