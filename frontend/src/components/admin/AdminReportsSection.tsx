import type { Report, ReportStatus } from "../../api/client";
import { ReportQueue } from "./ReportQueue";

type Props = {
  onChanged: () => Promise<void>;
  onStatusFilterChange: (status: ReportStatus | "all") => void;
  reports: Report[];
  statusCounts: Record<ReportStatus | "all", number>;
  statusFilter: ReportStatus | "all";
};

export function AdminReportsSection({ onChanged, onStatusFilterChange, reports, statusCounts, statusFilter }: Props) {
  return (
    <section className="admin-section admin-section-single">
      <ReportQueue
        reports={reports}
        statusCounts={statusCounts}
        statusFilter={statusFilter}
        onChanged={onChanged}
        onStatusFilterChange={onStatusFilterChange}
      />
    </section>
  );
}
