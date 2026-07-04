import { useState } from "react";

import { REPORT_REASON_LABELS } from "../../api/reportReasons";
import { deleteAdminReport, updateReport } from "../../api/reports";
import type { Report, ReportReason, ReportStatus, ReportTargetType } from "../../api/types";
import { adminReportStatusLabel } from "./adminStatusUi";
import { SystemModal } from "./SystemModal";

type Props = {
  onChanged: () => Promise<void>;
  reports: Report[];
};

const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  guide: "trasa",
  memory: "pamiątka",
  photo: "zdjęcie",
  place: "miejsce",
};

function reportReasonLabel(reason: ReportReason) {
  return REPORT_REASON_LABELS[reason];
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

export function ReportQueue({ onChanged, reports }: Props) {
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
        {reports.length > 0 ? (
          <div className="ui-table-panel report-list" role="list">
            {reports.map((report) => (
              <article className="report-item" key={report.id} role="listitem">
                <div className="report-item-body">
                  <span className={`report-status ui-status ui-status--${report.status}`}>
                    {adminReportStatusLabel(report.status)}
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
              <dd>{adminReportStatusLabel(selectedReport.status)}</dd>
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
          confirmLabel="Usuń"
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
