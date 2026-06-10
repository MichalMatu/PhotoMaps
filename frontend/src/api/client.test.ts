import { describe, expect, it } from "vitest";

import { mediaUrl } from "./client";

describe("mediaUrl", () => {
  it("keeps absolute URLs unchanged", () => {
    expect(mediaUrl("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
  });

  it("prefixes API base URL for local media paths", () => {
    expect(mediaUrl("/media/photos/test.jpg")).toBe("http://127.0.0.1:8000/media/photos/test.jpg");
  });
});
