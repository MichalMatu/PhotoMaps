import { describe, expect, it } from "vitest";

import { canSubmitPhotoUpload } from "./photoUploadState";

describe("canSubmitPhotoUpload", () => {
  it("requires a selected place and file", () => {
    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });

    expect(canSubmitPhotoUpload({ file: null, isUploading: false, placeId: "place-1" })).toBe(false);
    expect(canSubmitPhotoUpload({ file, isUploading: false, placeId: "" })).toBe(false);
    expect(canSubmitPhotoUpload({ file, isUploading: true, placeId: "place-1" })).toBe(false);
    expect(canSubmitPhotoUpload({ file, isUploading: false, placeId: "place-1" })).toBe(true);
  });
});
