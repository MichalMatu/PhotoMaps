import { expect, test } from "@playwright/test";

import { places, rynekCover } from "./fixtures/visualData";
import { API_URL } from "./support/config";
import { clickMapMarker } from "./support/mapInteractions";
import { mockSharedApi } from "./support/visualApi";

test("mobile TTS starts on the first tap even before voices are populated", async ({ page }) => {
  const spokenText = "Mobilny opis zdjęcia powinien ruszyć po pierwszym dotknięciu.";

  await page.setViewportSize({ height: 844, width: 390 });
  await page.addInitScript(() => {
    const calls: string[] = [];

    class FakeSpeechSynthesisUtterance {
      lang = "";
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      text: string;
      voice: SpeechSynthesisVoice | null = null;

      constructor(text = "") {
        this.text = text;
      }
    }

    Object.defineProperty(window, "__photomapTtsCalls", {
      configurable: true,
      value: calls,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: FakeSpeechSynthesisUtterance,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel() {},
        getVoices() {
          return [];
        },
        resume() {},
        speak(utterance: FakeSpeechSynthesisUtterance) {
          calls.push(utterance.text);
        },
      },
    });
  });

  await mockSharedApi(page);
  await page.route(`${API_URL}/api/places/${places[0].id}/photos/${rynekCover.id}`, (route) =>
    route.fulfill({
      json: {
        audio: rynekCover.audio,
        attribution_author: rynekCover.attribution_author,
        attribution_license: rynekCover.attribution_license,
        attribution_license_url: rynekCover.attribution_license_url,
        attribution_source_url: rynekCover.attribution_source_url,
        caption: rynekCover.caption,
        description_blocks: [{ type: "paragraph", text: spokenText }],
        id: rynekCover.id,
        place_id: rynekCover.place_id,
        public_path: rynekCover.public_path,
        thumb_path: rynekCover.thumb_path,
      },
    }),
  );

  await page.goto("/");
  await clickMapMarker(page, places[0].title);
  await clickMapMarker(page, rynekCover.caption);

  const detailDialog = page.getByRole("dialog", { name: places[0].title });
  const ttsButton = detailDialog.getByRole("button", { name: "Odczytaj opis zdjęcia" });
  await expect(ttsButton).toBeVisible();

  await ttsButton.click();

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { __photomapTtsCalls?: string[] }).__photomapTtsCalls?.slice() ?? [],
      ),
    )
    .toEqual([spokenText]);
});
