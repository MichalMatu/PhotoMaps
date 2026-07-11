import { describe, expect, it } from "vitest";

import type { AdminPhoto } from "../../api/types";
import {
  EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  photoAttributionDraftFromPhoto,
  photoPayloadFromDraft,
  sortPlacePhotosForPanel,
} from "./placePhotoPanelState";

function photo(id: string, status: AdminPhoto["status"], createdAt: string): AdminPhoto {
  return {
    admin_audio: null,
    admin_public_path: `/api/admin/photos/${id}/media/image`,
    admin_thumb_path: `/api/admin/photos/${id}/media/thumb`,
    approved_at: status === "approved" ? createdAt : null,
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: id,
    description_blocks: [],
    consent_confirmed: true,
    created_at: createdAt,
    id,
    place_id: "place-1",
    public_path: `/media/photos/${id}.jpg`,
    role: "gallery",
    source: "editorial",
    status,
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

describe("sortPlacePhotosForPanel", () => {
  it("keeps the cover first, then approved photos, then pending and rejected", () => {
    const photos = [
      photo("pending", "pending", "2026-01-04T00:00:00"),
      photo("approved-new", "approved", "2026-01-03T00:00:00"),
      photo("rejected", "rejected", "2026-01-05T00:00:00"),
      photo("cover", "approved", "2026-01-01T00:00:00"),
    ];

    expect(sortPlacePhotosForPanel(photos, "cover").map((item) => item.id)).toEqual([
      "cover",
      "approved-new",
      "pending",
      "rejected",
    ]);
  });
});

describe("photoPayloadFromDraft", () => {
  it("trims photo drafts and clears empty fields", () => {
    expect(
      photoPayloadFromDraft("  Nowy podpis  ", [{ type: "paragraph", text: "  Opis zdjęcia do odsłuchu.  " }], {
        attributionAuthor: "  Autor  ",
        attributionLicense: "  CC BY 4.0  ",
        attributionLicenseUrl: "  https://creativecommons.org/licenses/by/4.0/  ",
        attributionSourceUrl: "  https://commons.wikimedia.org/wiki/File:Photo.jpg  ",
      }),
    ).toEqual({
      attribution_author: "Autor",
      attribution_license: "CC BY 4.0",
      attribution_license_url: "https://creativecommons.org/licenses/by/4.0/",
      attribution_source_url: "https://commons.wikimedia.org/wiki/File:Photo.jpg",
      caption: "Nowy podpis",
      description_blocks: [{ type: "paragraph", text: "Opis zdjęcia do odsłuchu." }],
    });
    expect(photoPayloadFromDraft("   ", [], EMPTY_PHOTO_ATTRIBUTION_DRAFT)).toEqual({
      attribution_author: null,
      attribution_license: null,
      attribution_license_url: null,
      attribution_source_url: null,
      caption: null,
      description_blocks: [],
    });
  });

  it("builds an attribution draft from an existing photo", () => {
    expect(
      photoAttributionDraftFromPhoto({
        ...photo("photo-1", "approved", "2026-01-01T00:00:00"),
        attribution_author: "Autorka",
        attribution_license: "CC0",
        attribution_license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
        attribution_source_url: "https://commons.wikimedia.org/wiki/File:Photo.jpg",
      }),
    ).toEqual({
      attributionAuthor: "Autorka",
      attributionLicense: "CC0",
      attributionLicenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      attributionSourceUrl: "https://commons.wikimedia.org/wiki/File:Photo.jpg",
    });
  });
});
