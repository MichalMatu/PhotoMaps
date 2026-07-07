import type { ContentBlock, Guide, GuideKind, GuidePayload, GuideRoutePoint, GuideStatus } from "../../api/types";
import { normalizeContentBlocks } from "../content/contentBlocks";

export type GuideStatusFilter = GuideStatus | "all";

type GuidePayloadInput = {
  articleBlocks: ContentBlock[];
  description: string;
  editingGuide: Guide | null;
  generatedSlug: string;
  kind: GuideKind;
  routePoints: GuideRoutePoint[];
  status: GuideStatus;
  title: string;
};

export function guideStatusCounts(guides: Guide[]) {
  return {
    archived: guides.filter((guide) => guide.status === "archived").length,
    draft: guides.filter((guide) => guide.status === "draft").length,
    published: guides.filter((guide) => guide.status === "published").length,
  };
}

export function filterGuidesByStatus(guides: Guide[], status: GuideStatusFilter): Guide[] {
  return status === "all" ? guides : guides.filter((guide) => guide.status === status);
}

export function guidePayloadFromState({
  articleBlocks,
  description,
  editingGuide,
  generatedSlug,
  kind,
  routePoints,
  status,
  title,
}: GuidePayloadInput): GuidePayload | null {
  if (!title.trim() || (!editingGuide && !generatedSlug)) {
    return null;
  }

  return {
    slug: editingGuide?.slug ?? generatedSlug,
    kind,
    title,
    description: description.trim() || null,
    article_blocks: normalizeContentBlocks(articleBlocks),
    route_points: routePoints,
    status,
  };
}
