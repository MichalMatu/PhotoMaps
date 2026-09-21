import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  dismissModeratorRecruitment,
  isModeratorRecruitmentDismissed,
  MODERATOR_RECRUITMENT_STORAGE_KEY,
  ModeratorRecruitmentPrompt,
} from "./ModeratorRecruitmentPrompt";

function storageStub(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe("ModeratorRecruitmentPrompt", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a compact recruitment prompt for a new visitor", () => {
    const storage = storageStub();
    vi.stubGlobal("window", { localStorage: storage });

    const markup = renderToStaticMarkup(<ModeratorRecruitmentPrompt />);

    expect(markup).toContain("Szukam moderatorów");
    expect(markup).toContain("Chcę pomóc");
    expect(markup).toContain("PhotoMap");
  });

  it("stays hidden after dismissal", () => {
    const storage = storageStub("dismissed");
    vi.stubGlobal("window", { localStorage: storage });

    expect(isModeratorRecruitmentDismissed(storage)).toBe(true);
    expect(renderToStaticMarkup(<ModeratorRecruitmentPrompt />)).toBe("");
  });

  it("stores dismissal using the versioned key", () => {
    const storage = storageStub();

    dismissModeratorRecruitment(storage);

    expect(storage.setItem).toHaveBeenCalledWith(MODERATOR_RECRUITMENT_STORAGE_KEY, "dismissed");
    expect(isModeratorRecruitmentDismissed(storage)).toBe(true);
  });
});
