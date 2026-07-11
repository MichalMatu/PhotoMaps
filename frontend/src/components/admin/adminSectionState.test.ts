import { describe, expect, it } from "vitest";

import type { AdminMemory, AdminModerationCounts, AdminPhoto, Report } from "../../api/types";
import {
  countModerationSections,
  filterMemoriesByStatus,
  filterPhotosByStatus,
  filterReportsByStatus,
} from "./adminSectionState";

const PHOTOS: AdminPhoto[] = [
  {
    admin_audio: null,
    admin_public_path: "/api/admin/photos/1/media/image",
    admin_thumb_path: "/api/admin/photos/1/media/thumb",
    approved_at: null,
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: "a",
    description_blocks: [],
    consent_confirmed: true,
    created_at: "",
    id: "1",
    place_id: "p1",
    public_path: "",
    role: "gallery",
    source: "editorial",
    status: "pending",
    thumb_path: "",
  },
  {
    admin_audio: null,
    admin_public_path: "/api/admin/photos/2/media/image",
    admin_thumb_path: "/api/admin/photos/2/media/thumb",
    approved_at: "",
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: "b",
    description_blocks: [],
    consent_confirmed: true,
    created_at: "",
    id: "2",
    place_id: "p1",
    public_path: "",
    role: "gallery",
    source: "editorial",
    status: "approved",
    thumb_path: "",
  },
  {
    admin_audio: null,
    admin_public_path: "/api/admin/photos/3/media/image",
    admin_thumb_path: "/api/admin/photos/3/media/thumb",
    approved_at: null,
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: "c",
    description_blocks: [],
    consent_confirmed: true,
    created_at: "",
    id: "3",
    place_id: "p2",
    public_path: "",
    role: "gallery",
    source: "editorial",
    status: "rejected",
    thumb_path: "",
  },
];

const MEMORIES: AdminMemory[] = [
  {
    admin_audio: null,
    admin_public_path: "/api/admin/memories/1/media/image",
    admin_thumb_path: "/api/admin/memories/1/media/thumb",
    approved_at: null,
    audio: null,
    author_city: null,
    author_name: null,
    caption: "m1",
    consent_confirmed: true,
    created_at: "",
    id: "1",
    memory_text: "one",
    paid: false,
    place_id: "p1",
    public_path: null,
    share_slug: "one",
    status: "pending",
    thumb_path: null,
  },
  {
    admin_audio: null,
    admin_public_path: "/api/admin/memories/2/media/image",
    admin_thumb_path: "/api/admin/memories/2/media/thumb",
    approved_at: "",
    audio: null,
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
  { created_at: "", id: "1", message: null, reason: "other", status: "open", target_id: "p1", target_type: "place" },
  {
    created_at: "",
    id: "2",
    message: "x",
    reason: "wrong_data",
    status: "closed",
    target_id: "m1",
    target_type: "memory",
  },
];

const MODERATION_COUNTS: AdminModerationCounts = {
  memories: { all: 12, approved: 10, pending: 1, rejected: 1 },
  photos: { all: 1176, approved: 1150, pending: 23, rejected: 3 },
  reports: { all: 2, closed: 1, open: 1 },
};

describe("adminSectionState", () => {
  it("filters photos by selected status", () => {
    expect(filterPhotosByStatus(PHOTOS, "all")).toHaveLength(3);
    expect(filterPhotosByStatus(PHOTOS, "approved").map((photo) => photo.id)).toEqual(["2"]);
  });

  it("filters memories independently from photos", () => {
    expect(filterMemoriesByStatus(MEMORIES, "pending").map((memory) => memory.id)).toEqual(["1"]);
  });

  it("filters reports with open and closed statuses", () => {
    expect(filterReportsByStatus(REPORTS, "closed").map((report) => report.id)).toEqual(["2"]);
  });

  it("counts moderation section tabs from backend totals, not loaded page size", () => {
    expect(countModerationSections(MODERATION_COUNTS)).toEqual({
      memories: 2,
      photos: 26,
      reports: 2,
    });
  });
});
