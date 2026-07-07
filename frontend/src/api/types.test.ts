import { describe, expect, it } from "vitest";

import type {
  AdminMemory,
  AdminPhoto,
  CategoryUpdatePayload,
  CityUpdatePayload,
  GuideUpdatePayload,
  MediaRedactionReport,
  Memory,
  MemoryClaimRead,
  MemorySubmission,
  MemoryUpdatePayload,
  Photo,
  PhotoUpdatePayload,
  PlaceUpdatePayload,
  ReportPayload,
  ReportReason,
  ReportUpdatePayload,
} from "./types";

const publicPhoto: Photo = {
  audio: null,
  attribution_author: null,
  attribution_license: null,
  attribution_license_url: null,
  attribution_source_url: null,
  caption: null,
  description_blocks: [],
  id: "photo-1",
  place_id: "place-1",
  public_path: "/media/photos/photo-1.jpg",
  thumb_path: "/media/photos/photo-1-thumb.jpg",
};

const publicMemory: Memory = {
  audio: null,
  author_city: null,
  author_name: null,
  caption: "Pamiatka",
  id: "memory-1",
  memory_text: "Krotki opis",
  place_id: "place-1",
  public_path: "/media/memories/memory-1.jpg",
  thumb_path: "/media/memories/memory-1-thumb.jpg",
};

const adminPhoto: AdminPhoto = {
  ...publicPhoto,
  approved_at: null,
  consent_confirmed: true,
  created_at: "2026-06-10T00:00:00",
  role: "gallery",
  source: "editorial",
  status: "approved",
};

const adminMemory: AdminMemory = {
  admin_audio: null,
  admin_public_path: "/api/admin/memories/memory-1/media/image",
  admin_thumb_path: "/api/admin/memories/memory-1/media/thumb",
  approved_at: null,
  audio: null,
  author_city: null,
  author_name: null,
  caption: "Pamiatka",
  consent_confirmed: true,
  created_at: "2026-06-10T00:00:00",
  id: "memory-1",
  memory_text: "Krotki opis",
  paid: false,
  place_id: "place-1",
  public_path: "/media/memories/memory-1.jpg",
  share_slug: "memory-share",
  status: "approved",
  thumb_path: "/media/memories/memory-1-thumb.jpg",
};

const memorySubmission: MemorySubmission = {
  author_city: null,
  author_name: null,
  caption: "Pamiatka",
  created_at: "2026-06-10T00:00:00",
  id: "memory-1",
  memory_text: "Krotki opis",
  place_id: "place-1",
  status: "pending",
};

function publicPhotoConsent(photo: Photo) {
  // @ts-expect-error Public photo DTO must not expose admin consent fields.
  return photo.consent_confirmed;
}

function publicMemoryConsent(memory: Memory) {
  // @ts-expect-error Public memory DTO must not expose admin consent fields.
  return memory.consent_confirmed;
}

function memorySubmissionPublicPath(submission: MemorySubmission) {
  // @ts-expect-error Pending memory submission receipts must not expose public media paths.
  return submission.public_path;
}

function invalidReportReason() {
  // @ts-expect-error Report reason must stay aligned with the backend enum.
  const reason: ReportReason = "bad";
  return reason;
}

describe("media API DTO types", () => {
  it("keeps admin consent fields out of public media DTOs", () => {
    expect(publicPhotoConsent(publicPhoto)).toBeUndefined();
    expect(publicMemoryConsent(publicMemory)).toBeUndefined();
    expect(memorySubmissionPublicPath(memorySubmission)).toBeUndefined();
    expect(adminPhoto.consent_confirmed).toBe(true);
    expect(adminMemory.consent_confirmed).toBe(true);
  });
});

describe("contract DTO helper types", () => {
  it("models report reason as a closed contract enum", () => {
    const payload: ReportPayload = {
      message: null,
      reason: "wrong_data",
      target_id: "place-1",
      target_type: "place",
    };

    expect(payload.reason).toBe("wrong_data");
    expect(invalidReportReason()).toBe("bad");
  });

  it("keeps frontend update payloads partial where backend PATCH schemas are partial", () => {
    const categoryPatch: CategoryUpdatePayload = { label: "Kawiarnie" };
    const cityPatch: CityUpdatePayload = { default_zoom: 12 };
    const guidePatch: GuideUpdatePayload = { status: "published" };
    const placePatch: PlaceUpdatePayload = { cover_photo_id: null };
    const reportPatch: ReportUpdatePayload = { status: "closed" };
    const photoPatch: PhotoUpdatePayload = {};
    const memoryPatch: MemoryUpdatePayload = {
      caption: "Nowy podpis",
      claim_token: "token",
      memory_text: "Nowy tekst",
    };
    const claimRead: MemoryClaimRead = { can_edit: true };

    expect(categoryPatch.label).toBe("Kawiarnie");
    expect(cityPatch.default_zoom).toBe(12);
    expect(guidePatch.status).toBe("published");
    expect(placePatch.cover_photo_id).toBeNull();
    expect(reportPatch.status).toBe("closed");
    expect(photoPatch.caption).toBeUndefined();
    expect(memoryPatch.author_name).toBeUndefined();
    expect(claimRead.can_edit).toBe(true);
  });

  it("models the full media redaction report returned by admin endpoints", () => {
    const report: MediaRedactionReport = {
      actions: [
        {
          action: "redact_image",
          applied: true,
          label: "public",
          path: "/tmp/public.jpg",
          shapes: 1,
        },
      ],
      generated_at: "2026-06-18T00:00:00Z",
      id: "photo-1",
      issues: [],
      kind: "photo",
      mode: "apply",
      status: "ok",
      summary: {
        actions: { applied: 1, total: 1 },
        issues: { by_severity: { error: 0, info: 0, warning: 0 }, total: 0 },
      },
    };

    expect(report.actions[0].applied).toBe(true);
    expect(report.issues).toHaveLength(0);
  });
});
