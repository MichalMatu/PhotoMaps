import { expect, test } from "@playwright/test";

import { places, rynekCover, rynekSide } from "../fixtures/visualData";
import { API_URL } from "../support/config";
import { clickMapMarker } from "../support/mapInteractions";
import { mockSharedApi } from "../support/visualApi";

const audio = {
  mime_type: "audio/mpeg",
  public_path: "/media/visual/rynek-ambient.mp3",
  size_bytes: 1024,
};

const audioCover = { ...rynekCover, audio };
const audioPlaces = places.map((place) =>
  place.id === places[0].id
    ? {
        ...place,
        cover_photo: audioCover,
        preview_items: place.preview_items.map((item) =>
          item.id === rynekCover.id ? { ...item, audio } : item,
        ),
      }
    : place,
);

test("map polish shows labels, prefetches once, and animates only playing audio", async ({ page }) => {
  await page.setViewportSize({ height: 820, width: 1280 });
  await mockSharedApi(page, audioPlaces);

  let galleryRequests = 0;
  await page.route(`${API_URL}/api/places/${places[0].id}/photos`, (route) => {
    galleryRequests += 1;
    return route.fulfill({ json: [audioCover, rynekSide] });
  });
  await page.route(`${API_URL}/api/places/${places[0].id}/photos/${rynekCover.id}`, (route) =>
    route.fulfill({ json: { ...audioCover, description_blocks: [] } }),
  );
  await page.route(`${API_URL}${audio.public_path}`, (route) =>
    route.fulfill({ body: "", contentType: audio.mime_type }),
  );

  await page.goto("/");

  const marker = page.locator(`.place-photo-marker[title="${places[0].title}"]`);
  const markerSurface = marker.locator("span");
  await expect(marker).toBeVisible();
  expect(galleryRequests).toBe(0);

  await markerSurface.hover();
  await expect(page.locator(".place-marker-hover-tooltip")).toContainText(places[0].title);
  await expect.poll(() => galleryRequests).toBe(1);

  await page.mouse.move(1200, 780);
  await marker.focus();
  await expect(page.locator(".place-marker-hover-tooltip")).toContainText(places[0].title);
  await expect.poll(() => galleryRequests).toBe(1);

  await clickMapMarker(page, places[0].title);
  await expect(page.locator(".photo-gallery-marker")).toHaveCount(3);
  await expect.poll(() => galleryRequests).toBe(1);

  const audioGalleryMarker = page.locator(".photo-gallery-marker:has(.map-audio-waveform)").first();
  await expect(audioGalleryMarker).toHaveCount(1);
  await audioGalleryMarker.locator("span").click();

  const player = page.locator(".photo-detail-audio-control audio");
  await expect(player).toHaveCount(1);
  await player.dispatchEvent("play");
  await expect(page.locator(".photo-gallery-marker .map-audio-waveform.is-playing")).toHaveCount(1);

  await player.dispatchEvent("pause");
  await expect(page.locator(".photo-gallery-marker .map-audio-waveform.is-playing")).toHaveCount(0);
});
