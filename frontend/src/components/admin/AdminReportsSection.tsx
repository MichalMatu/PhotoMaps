import type { Report } from "../../api/types";
import { ReportQueue } from "./ReportQueue";

type Props = {
  onChanged: () => Promise<void>;
  reports: Report[];
};

export function AdminReportsSection({ onChanged, reports }: Props) {
  return (
    <section className="admin-section admin-section-single">
      <ReportQueue reports={reports} onChanged={onChanged} />
    </section>
  );
}
