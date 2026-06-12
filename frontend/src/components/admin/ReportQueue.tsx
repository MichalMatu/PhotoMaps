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
      <div className="report-queue">
        <div className="report-queue-toolbar">
          <div className="status-tabs" role="tablist" aria-label="Status zgłoszeń">
            {STATUS_FILTERS.map((filter) => (
              <button
                className={statusFilter === filter.value ? "status-tab is-active" : "status-tab"}
                key={filter.value}
                type="button"
                onClick={() => onStatusFilterChange(filter.value)}
              >
                {filter.label} <span className="status-tab-count">{statusCounts[filter.value]}</span>
              </button>
            ))}
          </div>
        </div>
        {reports.length > 0 ? (
          <div className="report-list" role="list">
            {reports.map((report) => (
              <article className="report-item" key={report.id} role="listitem">
                <div className="report-item-body">
                  <span className={`report-status status-badge status-badge--${report.status}`}>{report.status}</span>
                  <strong className="report-reason">{report.reason}</strong>
                  <p className="report-message">{report.message ?? "Brak wiadomości."}</p>
                  <span className="report-target muted-text">
                    {report.target_type}: {report.target_id}
                  </span>
                </div>
                <div className="report-actions review-actions">
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
        ) : (
          <p className="report-empty-state">Brak zgłoszeń dla wybranego statusu.</p>
        )}
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
