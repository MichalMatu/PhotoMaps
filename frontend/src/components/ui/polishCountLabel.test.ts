import { describe, expect, it } from "vitest";

import { polishCountLabel } from "./polishCountLabel";

const GUIDE_FORMS = {
  few: "przewodniki",
  many: "przewodników",
  one: "przewodnik",
};

describe("polishCountLabel", () => {
  it("formats one, few, and many forms for Polish count labels", () => {
    expect(polishCountLabel(0, GUIDE_FORMS)).toBe("0 przewodników");
    expect(polishCountLabel(1, GUIDE_FORMS)).toBe("1 przewodnik");
    expect(polishCountLabel(2, GUIDE_FORMS)).toBe("2 przewodniki");
    expect(polishCountLabel(5, GUIDE_FORMS)).toBe("5 przewodników");
    expect(polishCountLabel(12, GUIDE_FORMS)).toBe("12 przewodników");
    expect(polishCountLabel(22, GUIDE_FORMS)).toBe("22 przewodniki");
    expect(polishCountLabel(24, GUIDE_FORMS)).toBe("24 przewodniki");
    expect(polishCountLabel(112, GUIDE_FORMS)).toBe("112 przewodników");
  });
});
