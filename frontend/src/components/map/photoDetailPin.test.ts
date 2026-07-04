import { describe, expect, it } from "vitest";

import { buildPhotoDetailPinRequest } from "./photoDetailPin";

describe("buildPhotoDetailPinRequest", () => {
  it("uses the image natural ratio when available", () => {
    expect(
      buildPhotoDetailPinRequest(
        { height: 600, left: 10, top: 20, width: 900 },
        { naturalHeight: 1200, naturalWidth: 800 },
      ),
    ).toEqual({
      aspectRatio: 2 / 3,
      sourceRect: { height: 600, left: 10, top: 20, width: 900 },
    });
  });

  it("falls back to the modal rect ratio when image dimensions are unavailable", () => {
    expect(buildPhotoDetailPinRequest({ height: 300, left: 0, top: 0, width: 600 }, null)).toEqual({
      aspectRatio: 2,
      sourceRect: { height: 300, left: 0, top: 0, width: 600 },
    });
  });

  it("returns a null ratio when neither image nor rect can provide dimensions", () => {
    expect(buildPhotoDetailPinRequest(null, { naturalHeight: 0, naturalWidth: 0 })).toEqual({
      aspectRatio: null,
      sourceRect: null,
    });
  });
});
