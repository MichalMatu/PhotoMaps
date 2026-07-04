import { describe, expect, it } from "vitest";

import { syncPhotoGalleryPaneTransform } from "./mapPanes";

describe("syncPhotoGalleryPaneTransform", () => {
  it("keeps an out-of-map photo gallery pane aligned with Leaflet layer coordinates", () => {
    const photoGalleryPane = { style: { transform: "" } } as HTMLElement;
    const mapPane = { style: { transform: "translate3d(34px, 16px, 0px)" } } as HTMLElement;

    syncPhotoGalleryPaneTransform(photoGalleryPane, mapPane);

    expect(photoGalleryPane.style.transform).toBe("translate3d(34px, 16px, 0px)");
  });
});
