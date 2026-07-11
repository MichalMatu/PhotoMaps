import type { AdminMediaAudioFilter, AdminMemory, AdminPhoto, Report } from "../../api/types";
import { contentBlocksTextForTts } from "../content/contentBlocks";

export type AdminModerationAudioFilter = AdminMediaAudioFilter;

export type AdminModerationFilters = {
  audio: AdminModerationAudioFilter;
  placeId: string;
  query: string;
};

export const DEFAULT_ADMIN_MODERATION_FILTERS: AdminModerationFilters = {
  audio: "all",
  placeId: "all",
  query: "",
};

function normalizedQuery(query: string) {
  return query.trim().toLocaleLowerCase("pl");
}

function includesQuery(values: Array<string | null | undefined>, query: string) {
  const normalized = normalizedQuery(query);
  if (!normalized) {
    return true;
  }

  return values.filter(Boolean).some((value) => value?.toLocaleLowerCase("pl").includes(normalized));
}

function matchesAudio(audio: { public_path: string } | null, filter: AdminModerationAudioFilter) {
  if (filter === "all") return true;
  if (filter === "with-audio") return Boolean(audio);
  return !audio;
}

export function filterAdminModerationPhotos(photos: AdminPhoto[], filters: AdminModerationFilters): AdminPhoto[] {
  return photos.filter((photo) => {
    if (filters.placeId !== "all" && photo.place_id !== filters.placeId) return false;
    if (!matchesAudio(photo.admin_audio, filters.audio)) return false;
    return includesQuery(
      [
        photo.caption,
        contentBlocksTextForTts(photo.description_blocks),
        photo.attribution_author,
        photo.attribution_license,
        photo.attribution_license_url,
        photo.attribution_source_url,
        photo.id,
      ],
      filters.query,
    );
  });
}

export function filterAdminModerationMemories(memories: AdminMemory[], filters: AdminModerationFilters): AdminMemory[] {
  return memories.filter((memory) => {
    if (filters.placeId !== "all" && memory.place_id !== filters.placeId) return false;
    if (!matchesAudio(memory.admin_audio, filters.audio)) return false;
    return includesQuery(
      [memory.caption, memory.memory_text, memory.author_name, memory.author_city, memory.id],
      filters.query,
    );
  });
}

export function filterAdminModerationReports(reports: Report[], filters: AdminModerationFilters): Report[] {
  return reports.filter((report) => {
    if (filters.placeId !== "all" && (report.target_type !== "place" || report.target_id !== filters.placeId)) {
      return false;
    }
    return includesQuery([report.message, report.reason, report.target_id, report.id], filters.query);
  });
}

export function countActiveAdminModerationFilters(filters: AdminModerationFilters): number {
  return [
    filters.query.trim() ? "query" : null,
    filters.placeId !== "all" ? "place" : null,
    filters.audio !== "all" ? "audio" : null,
  ].filter(Boolean).length;
}
