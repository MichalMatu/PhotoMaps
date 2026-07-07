import { describe, expect, it } from "vitest";

import type { AdminMemory, AdminPhoto, Report } from "../../api/types";
import {
  DEFAULT_ADMIN_MODERATION_FILTERS,
  countActiveAdminModerationFilters,
  filterAdminModerationMemories,
  filterAdminModerationPhotos,
  filterAdminModerationReports,
} from "./adminModerationFilters";

const photo = {
  approved_at: null,
  audio: null,
  attribution_author: "Marta",
  attribution_license: "CC BY 4.0",
  attribution_license_url: "https://creativecommons.org/licenses/by/4.0/",
  attribution_source_url: "https://commons.wikimedia.org/wiki/File:Neon.jpg",
  caption: "Neon",
  description_blocks: [{ type: "paragraph", text: "Opis zdjęcia" }],
  consent_confirmed: true,
  created_at: "",
  id: "photo-1",
  place_id: "place-1",
  public_path: "/media/photo.jpg",
  role: "gallery",
  source: "editorial",
  status: "pending",
  thumb_path: "/media/photo-thumb.jpg",
} satisfies AdminPhoto;

const memory = {
  admin_audio: {
    duration_seconds: 2,
    mime_type: "audio/mpeg",
    public_path: "/api/admin/memories/memory-1/media/audio",
    size_bytes: 1000,
  },
  admin_public_path: "/api/admin/memories/memory-1/media/image",
  admin_thumb_path: "/api/admin/memories/memory-1/media/thumb",
  approved_at: null,
  audio: { duration_seconds: 2, mime_type: "audio/mpeg", public_path: "/media/audio.mp3", size_bytes: 1000 },
  author_city: "Wrocław",
  author_name: "Marta",
  caption: "Wieczór",
  consent_confirmed: true,
  created_at: "",
  id: "memory-1",
  memory_text: "Krótki tekst",
  paid: false,
  place_id: "place-2",
  public_path: "/media/memory.jpg",
  share_slug: "memory",
  status: "approved",
  thumb_path: "/media/memory-thumb.jpg",
} satisfies AdminMemory;

const report = {
  created_at: "",
  id: "report-1",
  message: "Zły opis",
  reason: "wrong_data",
  status: "open",
  target_id: "place-1",
  target_type: "place",
} satisfies Report;

describe("admin moderation filters", () => {
  it("filters photos, memories and reports by local search fields", () => {
    expect(filterAdminModerationPhotos([photo], { ...DEFAULT_ADMIN_MODERATION_FILTERS, query: "neo" })).toEqual([
      photo,
    ]);
    expect(filterAdminModerationPhotos([photo], { ...DEFAULT_ADMIN_MODERATION_FILTERS, query: "wikimedia" })).toEqual([
      photo,
    ]);
    expect(
      filterAdminModerationMemories([memory], { ...DEFAULT_ADMIN_MODERATION_FILTERS, audio: "with-audio" }),
    ).toEqual([memory]);
    expect(filterAdminModerationReports([report], { ...DEFAULT_ADMIN_MODERATION_FILTERS, placeId: "place-1" })).toEqual(
      [report],
    );
  });

  it("counts active filters", () => {
    expect(
      countActiveAdminModerationFilters({
        audio: "without-audio",
        placeId: "place-1",
        query: "",
      }),
    ).toBe(2);
  });
});
