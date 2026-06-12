import { describe, expect, it, vi } from "vitest";

import { uploadAndApproveAdminPlacePhoto } from "./adminPhotoUpload";

describe("uploadAndApproveAdminPlacePhoto", () => {
  it("uploads and approves an editorial admin photo", async () => {
    const file = new File(["image"], "place.jpg", { type: "image/jpeg" });
    const uploadAdminPlacePhoto = vi.fn(async () => ({
      approved_at: null,
      caption: "Główne",
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
      caption: "Główne",
      created_at: "",
      id: "photo-1",
      place_id: "place-1",
      public_path: "/media/photos/photo.jpg",
      role: "gallery" as const,
      source: "editorial" as const,
      status: "approved" as const,
      thumb_path: "/media/photos/photo-thumb.jpg",
    }));

    await uploadAndApproveAdminPlacePhoto("place-1", file, "Główne", { reviewPhoto, uploadAdminPlacePhoto });

    expect(uploadAdminPlacePhoto).toHaveBeenCalledWith("place-1", file, "Główne");
    expect(reviewPhoto).toHaveBeenCalledWith("photo-1", "approved");
  });
});
