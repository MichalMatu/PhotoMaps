import { afterEach, describe, expect, it, vi } from "vitest";

import { lockDocumentScroll, unlockDocumentScroll } from "./documentScrollLock";

function createFakeDocument(clientWidth = 1180) {
  return {
    body: {
      style: {
        overflow: "auto",
        paddingRight: "3px",
        position: "relative",
        top: "12px",
        width: "90%",
      },
    },
    documentElement: {
      clientWidth,
      style: {
        overflow: "clip",
      },
    },
  };
}

describe("document scroll lock", () => {
  afterEach(() => {
    unlockDocumentScroll();
    unlockDocumentScroll();
    unlockDocumentScroll();
    vi.unstubAllGlobals();
  });

  it("freezes the page at the current scroll position and restores it on unlock", () => {
    const fakeDocument = createFakeDocument();
    const scrollTo = vi.fn();
    vi.stubGlobal("document", fakeDocument);
    vi.stubGlobal("window", { innerWidth: 1200, scrollY: 320, scrollTo });

    lockDocumentScroll();

    expect(fakeDocument.documentElement.style.overflow).toBe("hidden");
    expect(fakeDocument.body.style.overflow).toBe("hidden");
    expect(fakeDocument.body.style.position).toBe("fixed");
    expect(fakeDocument.body.style.top).toBe("-320px");
    expect(fakeDocument.body.style.width).toBe("100%");
    expect(fakeDocument.body.style.paddingRight).toBe("20px");

    unlockDocumentScroll();

    expect(fakeDocument.documentElement.style.overflow).toBe("clip");
    expect(fakeDocument.body.style.overflow).toBe("auto");
    expect(fakeDocument.body.style.position).toBe("relative");
    expect(fakeDocument.body.style.top).toBe("12px");
    expect(fakeDocument.body.style.width).toBe("90%");
    expect(fakeDocument.body.style.paddingRight).toBe("3px");
    expect(scrollTo).toHaveBeenCalledWith(0, 320);
  });

  it("keeps the document locked until the last stacked modal unlocks", () => {
    const fakeDocument = createFakeDocument(1200);
    const scrollTo = vi.fn();
    vi.stubGlobal("document", fakeDocument);
    vi.stubGlobal("window", { innerWidth: 1200, scrollY: 180, scrollTo });

    lockDocumentScroll();
    lockDocumentScroll();
    unlockDocumentScroll();

    expect(fakeDocument.documentElement.style.overflow).toBe("hidden");
    expect(fakeDocument.body.style.position).toBe("fixed");
    expect(scrollTo).not.toHaveBeenCalled();

    unlockDocumentScroll();

    expect(fakeDocument.documentElement.style.overflow).toBe("clip");
    expect(fakeDocument.body.style.position).toBe("relative");
    expect(scrollTo).toHaveBeenCalledWith(0, 180);
  });
});
