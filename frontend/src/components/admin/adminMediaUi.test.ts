import { describe, expect, it } from "vitest";

import { ADMIN_MEDIA_STATUS_FILTERS, ADMIN_MEDIA_STATUS_LABELS, memoryCountLabel } from "./adminMediaUi";

describe("admin media UI helpers", () => {
  it("keeps the shared status filter order stable", () => {
    expect(ADMIN_MEDIA_STATUS_FILTERS.map((filter) => filter.value)).toEqual(["pending", "rejected"]);
    expect(ADMIN_MEDIA_STATUS_LABELS).toMatchObject({
      approved: "zatwierdzone",
      pending: "do sprawdzenia",
      rejected: "odrzucone",
    });
  });

  it("formats Polish memory count labels", () => {
    expect(memoryCountLabel(1)).toBe("1 pamiątka");
    expect(memoryCountLabel(2)).toBe("2 pamiątki");
    expect(memoryCountLabel(5)).toBe("5 pamiątek");
    expect(memoryCountLabel(12)).toBe("12 pamiątek");
    expect(memoryCountLabel(22)).toBe("22 pamiątki");
  });
});
