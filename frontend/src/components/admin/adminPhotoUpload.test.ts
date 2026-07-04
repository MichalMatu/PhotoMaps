import { describe, expect, it, vi } from "vitest";

import { uploadAndApproveAdminPlacePhoto } from "./adminPhotoUpload";

describe("uploadAndApproveAdminPlacePhoto", () => {
  it("uploads and approves an editorial admin photo", async () => {
    const file = new File(["image"], "place.jpg", { type: "image/jpeg" });
    const uploadAdminPlacePhoto = vi.fn(async () => ({
      approved_at: null,
      audio: null,
      attribution_author: null,
      attribution_license: null,
      attribution_license_url: null,
      attribution_source_url: null,
      caption: "Główne",
      description_blocks: [],
      consent_confirmed: true,
      created_at: "",
      id: "photo-1",
      place_id: "place-1",
      public_path: "/media/photos/photo.jpg",
      role: "gallery" as const,
      source: "editorial" as const,
      status: "pending" as const,
      thumb_path: "/media/photos/photo-thumb.jpg",
    }));
    const reviewPhoto = vi.fn(async () => ({
      approved_at: "",
      audio: null,
      attribution_author: null,
      attribution_license: null,
      attribution_license_url: null,
      attribution_source_url: null,
      caption: "Główne",
      description_blocks: [],
      consent_confirmed: true,
      created_at: "",
      id: "photo-1",
      place_id: "place-1",
      public_path: "/media/photos/photo.jpg",
      role: "gallery" as const,
      source: "editorial" as const,
      status: "approved" as const,
      thumb_path: "/media/photos/photo-thumb.jpg",
    }));

    await uploadAndApproveAdminPlacePhoto(
      "place-1",
      file,
      {
        attribution_author: "Autor",
        attribution_license: "CC0",
        attribution_license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
        attribution_source_url: "https://commons.wikimedia.org/wiki/File:Photo.jpg",
        caption: "Główne",
        description_blocks: [{ type: "paragraph", text: "Opis zdjęcia" }],
      },
      null,
      { reviewPhoto, uploadAdminPlacePhoto },
    );

    expect(uploadAdminPlacePhoto).toHaveBeenCalledWith(
      "place-1",
      file,
      {
        attribution_author: "Autor",
        attribution_license: "CC0",
        attribution_license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
        attribution_source_url: "https://commons.wikimedia.org/wiki/File:Photo.jpg",
        caption: "Główne",
        description_blocks: [{ type: "paragraph", text: "Opis zdjęcia" }],
      },
      null,
    );
    expect(reviewPhoto).toHaveBeenCalledWith("photo-1", "approved");
  });
});
