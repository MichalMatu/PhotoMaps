import { useState } from "react";

import {
  deleteAdminReport,
  updateReport,
  type Report,
  type ReportStatus,
  type ReportTargetType,
} from "../../api/client";
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

const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  closed: "zamknięte",
  open: "otwarte",
};

const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  guide: "trasa",
  memory: "pamiątka",
  photo: "zdjęcie",
  place: "miejsce",
};

const REPORT_REASON_LABELS: Record<string, string> = {
  bad_photo: "Problem ze zdjęciem",
  closed_place: "Miejsce już nie działa",
  other: "Inny powód",
  wrong_data: "Nieaktualne dane",
};

function reportReasonLabel(reason: string) {
  return REPORT_REASON_LABELS[reason] ?? reason;
}

function reportCreatedAtLabel(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ReportQueue({ onChanged, onStatusFilterChange, reports, statusCounts, statusFilter }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  async function handleStatus(report: Report, status: ReportStatus) {
    try {
      const updatedReport = await updateReport(report.id, { status });
      if (selectedReport?.id === report.id) {
        setSelectedReport(updatedReport);
      }
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zmienić statusu zgłoszenia.");
    }
  }

  function requestDeleteReport(report: Report) {
    setSelectedReport(null);
    setReportToDelete(report);
  }

  async function handleConfirmDelete() {
    if (!reportToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAdminReport(reportToDelete.id);
      setReportToDelete(null);
      await onChanged();
    } catch (reason) {
      setReportToDelete(null);
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się trwale usunąć zgłoszenia.");
    } finally {
      setIsDeleting(false);
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
          <div className="ui-table-panel report-list" role="list">
            {reports.map((report) => (
              <article className="report-item" key={report.id} role="listitem">
                <div className="report-item-body">
                  <span className={`report-status ui-status ui-status--${report.status}`}>
                    {REPORT_STATUS_LABELS[report.status]}
                  </span>
                  <strong className="report-reason">{reportReasonLabel(report.reason)}</strong>
                  <p className="report-message">{report.message ?? "Brak wiadomości."}</p>
                  <span className="report-target muted-text">
                    {REPORT_TARGET_LABELS[report.target_type]}: {report.target_id}
                  </span>
                </div>
                <div className="report-actions review-actions">
                  <button
                    className="ui-button ui-button--secondary"
                    type="button"
                    onClick={() => setSelectedReport(report)}
                  >
                    Otwórz
                  </button>
                  {report.status !== "closed" ? (
                    <button type="button" onClick={() => handleStatus(report, "closed")}>
                      Zamknij zgłoszenie
                    </button>
                  ) : (
                    <button
                      className="ui-button ui-button--secondary"
                      type="button"
                      onClick={() => handleStatus(report, "open")}
                    >
                      Przywróć
                    </button>
                  )}
                  <button
                    className="ui-button ui-button--danger"
                    type="button"
                    onClick={() => requestDeleteReport(report)}
                  >
                    Usuń
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="ui-empty report-empty-state">Brak zgłoszeń dla wybranego statusu.</p>
        )}
      </div>
      {selectedReport ? (
        <SystemModal
          eyebrow="Zgłoszenia"
          showActions={false}
          size="wide"
          title={reportReasonLabel(selectedReport.reason)}
          onClose={() => setSelectedReport(null)}
        >
          <dl className="report-detail-grid">
            <div>
              <dt>Status</dt>
              <dd>{REPORT_STATUS_LABELS[selectedReport.status]}</dd>
            </div>
            <div>
              <dt>Cel</dt>
              <dd>
                {REPORT_TARGET_LABELS[selectedReport.target_type]}: {selectedReport.target_id}
              </dd>
            </div>
            <div>
              <dt>Utworzone</dt>
              <dd>{reportCreatedAtLabel(selectedReport.created_at)}</dd>
            </div>
            <div>
              <dt>Wiadomość</dt>
              <dd>{selectedReport.message ?? "Brak wiadomości."}</dd>
            </div>
          </dl>
          <div className="report-detail-actions">
            <button className="ui-button ui-button--ghost" type="button" onClick={() => setSelectedReport(null)}>
              Gotowe
            </button>
            {selectedReport.status !== "closed" ? (
              <button type="button" onClick={() => handleStatus(selectedReport, "closed")}>
                Zamknij zgłoszenie
              </button>
            ) : (
              <button
                className="ui-button ui-button--secondary"
                type="button"
                onClick={() => handleStatus(selectedReport, "open")}
              >
                Przywróć
              </button>
            )}
            <button
              className="ui-button ui-button--danger"
              type="button"
              onClick={() => requestDeleteReport(selectedReport)}
            >
              Usuń
            </button>
          </div>
        </SystemModal>
      ) : null}
      {reportToDelete ? (
        <SystemModal
          confirmLabel="Usuń trwale"
          isBusy={isDeleting}
          message={`Zgłoszenie "${reportReasonLabel(reportToDelete.reason)}" zostanie trwale usunięte. Tej operacji nie da się cofnąć.`}
          title="Usunąć zgłoszenie?"
          tone="danger"
          onClose={() => setReportToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
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
