import { describe, expect, it } from "vitest";

import { createAdminModerationRefreshActions, createAdminPlaceRefreshActions } from "./adminRefreshActions";

function refreshRecorder() {
  const calls: string[] = [];
  return {
    calls,
    refresh: (name: string) => async () => {
      calls.push(name);
    },
    refreshWithStatus: (name: string) => async (status?: string) => {
      calls.push(`${name}:${status ?? "all"}`);
    },
  };
}

describe("admin refresh actions", () => {
  it("refreshes place photo edits with public preview and moderation counters", async () => {
    const recorder = refreshRecorder();
    const actions = createAdminPlaceRefreshActions({
      refreshCategories: recorder.refresh("categories"),
      refreshMapPlaces: recorder.refresh("mapPlaces"),
      refreshModerationCounts: recorder.refresh("counts"),
      refreshPhotos: recorder.refreshWithStatus("photos"),
      refreshPlaces: recorder.refresh("places"),
    });

    await actions.refreshPhotosPlacesAndPublicPreview("approved");

    expect(recorder.calls).toEqual(["photos:approved", "places", "mapPlaces", "counts"]);
  });

  it("refreshes place taxonomy changes with public preview only", async () => {
    const recorder = refreshRecorder();
    const actions = createAdminPlaceRefreshActions({
      refreshCategories: recorder.refresh("categories"),
      refreshMapPlaces: recorder.refresh("mapPlaces"),
      refreshModerationCounts: recorder.refresh("counts"),
      refreshPhotos: recorder.refreshWithStatus("photos"),
      refreshPlaces: recorder.refresh("places"),
    });

    await actions.refreshCategoriesAndPublicPreview();

    expect(recorder.calls).toEqual(["categories", "mapPlaces"]);
  });

  it("refreshes moderated media without touching unrelated report data", async () => {
    const recorder = refreshRecorder();
    const actions = createAdminModerationRefreshActions({
      refreshMemories: recorder.refreshWithStatus("memories"),
      refreshModerationCounts: recorder.refresh("counts"),
      refreshPhotos: recorder.refreshWithStatus("photos"),
      refreshPlaces: recorder.refresh("places"),
      refreshReports: recorder.refreshWithStatus("reports"),
    });

    await actions.refreshMemoriesAndPlaces("pending");
    await actions.refreshPhotosAndPlaces("rejected");

    expect(recorder.calls).toEqual(["memories:pending", "places", "counts", "photos:rejected", "places", "counts"]);
  });

  it("refreshes report moderation without reloading places or media queues", async () => {
    const recorder = refreshRecorder();
    const actions = createAdminModerationRefreshActions({
      refreshMemories: recorder.refreshWithStatus("memories"),
      refreshModerationCounts: recorder.refresh("counts"),
      refreshPhotos: recorder.refreshWithStatus("photos"),
      refreshPlaces: recorder.refresh("places"),
      refreshReports: recorder.refreshWithStatus("reports"),
    });

    await actions.refreshReportsAndModerationCounts("open");

    expect(recorder.calls).toEqual(["reports:open", "counts"]);
  });
});
