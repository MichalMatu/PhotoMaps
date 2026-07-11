import { afterEach, describe, expect, it } from "vitest";

import { clearAdminSessionToken, getAdminSessionToken, setAdminSessionToken } from "./auth";

afterEach(() => {
  clearAdminSessionToken();
});

describe("admin session token", () => {
  it("keeps the token only in module memory", () => {
    setAdminSessionToken("admin-token");

    expect(getAdminSessionToken()).toBe("admin-token");
    expect(globalThis.sessionStorage?.getItem("photomaps_admin_token")).not.toBe("admin-token");

    clearAdminSessionToken();
    expect(getAdminSessionToken()).toBe("");
  });
});
