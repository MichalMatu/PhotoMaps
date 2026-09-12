import { useEffect, useRef } from "react";

import type { ReportStatus, ReviewStatus } from "../../api/types";
import type { AdminModerationMediaStatus } from "./adminMediaUi";
import type { AdminModerationSection, AdminSection } from "./adminSections";

type Props = {
  activeModerationSection: AdminModerationSection;
  activeSection: AdminSection;
  adminToken: string;
  memoryStatusFilter: AdminModerationMediaStatus;
  refreshGuides: () => Promise<void>;
  refreshMemories: (status?: ReviewStatus | "all") => Promise<void>;
  refreshReports: (status?: ReportStatus | "all") => Promise<void>;
  reportStatusFilter: ReportStatus;
};

export function useAdminSectionDataLoader({
  activeModerationSection,
  activeSection,
  adminToken,
  memoryStatusFilter,
  refreshGuides,
  refreshMemories,
  refreshReports,
  reportStatusFilter,
}: Props) {
  const loadedKeysRef = useRef(new Set<string>());

  useEffect(() => {
    if (!adminToken) {
      loadedKeysRef.current.clear();
      return;
    }

    let key: string | null = null;
    let load: (() => Promise<void>) | null = null;

    if (activeSection === "guides") {
      key = "guides";
      load = refreshGuides;
    } else if (activeSection === "moderation" && activeModerationSection === "memories") {
      key = `memories:${memoryStatusFilter}`;
      load = () => refreshMemories(memoryStatusFilter);
    } else if (activeSection === "moderation" && activeModerationSection === "reports") {
      key = `reports:${reportStatusFilter}`;
      load = () => refreshReports(reportStatusFilter);
    }

    if (!key || !load || loadedKeysRef.current.has(key)) {
      return;
    }

    loadedKeysRef.current.add(key);
    load().catch(() => {
      loadedKeysRef.current.delete(key);
    });
  }, [
    activeModerationSection,
    activeSection,
    adminToken,
    memoryStatusFilter,
    refreshGuides,
    refreshMemories,
    refreshReports,
    reportStatusFilter,
  ]);
}
