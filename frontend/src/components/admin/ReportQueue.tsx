import { useState } from "react";

import { updateReport, type Report, type ReportStatus } from "../../api/client";
import { SystemModal } from "./SystemModal";

type Props = {
  onChanged: () => Promise<void>;
  reports: Report[];
  statusCounts: Record<ReportStatus | "all", number>;
  statusFilter: ReportStatus | "all";
  onStatusFilterChange: (status: ReportStatus | "all") => void;
};

const STATUS_FILTERS: Array<{ label: string; value: ReportStatus | "all" }> = [
  { label: "Wszystkie", value: "all" },
  { label: "Otwarte", value: "open" },
  { label: "Zamknięte", value: "closed" },
];

export function ReportQueue({ onChanged, onStatusFilterChange, reports, statusCounts, statusFilter }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleStatus(reportId: string, status: ReportStatus) {
    try {
      await updateReport(reportId, { status });
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zmienić statusu zgłoszenia.");
    }
  }

  return (
    <>
      <div className="photo-queue">
        <div className="section-heading">
          <h2>Zgłoszenia</h2>
          <span>{reports.length}</span>
        </div>
        <div className="status-tabs" role="tablist" aria-label="Status zgłoszeń">
          {STATUS_FILTERS.map((filter) => (
            <button
              className={statusFilter === filter.value ? "status-tab is-active" : "status-tab"}
              key={filter.value}
              type="button"
              onClick={() => onStatusFilterChange(filter.value)}
            >
              {filter.label} <span>{statusCounts[filter.value]}</span>
            </button>
          ))}
        </div>
        <div className="report-list">
          {reports.map((report) => (
            <article className="report-item" key={report.id}>
              <div>
                <span className={`status-badge status-badge--${report.status}`}>{report.status}</span>
                <strong>{report.reason}</strong>
                <p>{report.message ?? "Brak wiadomości."}</p>
                <span className="muted-text">
                  {report.target_type}: {report.target_id}
                </span>
              </div>
              <div className="review-actions">
                {report.status !== "closed" ? (
                  <button type="button" onClick={() => handleStatus(report.id, "closed")}>
                    Zamknij
                  </button>
                ) : (
                  <button className="secondary-button" type="button" onClick={() => handleStatus(report.id, "open")}>
                    Otwórz
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {reports.length === 0 ? <p className="notice">Brak zgłoszeń dla wybranego statusu.</p> : null}
      </div>
      {errorMessage ? (
        <SystemModal
          confirmLabel="Rozumiem"
          message={errorMessage}
          title="Operacja nie powiodła się"
          tone="error"
          onClose={() => setErrorMessage(null)}
        />
      ) : null}
    </>
  );
}
