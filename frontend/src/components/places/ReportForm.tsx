import { FormEvent, useState } from "react";

import { DEFAULT_REPORT_REASON, REPORT_REASON_OPTIONS } from "../../api/reportReasons";
import { createReport } from "../../api/reports";
import type { ReportReason, ReportTargetType } from "../../api/types";
import { ErrorModal, errorDetails, type OperationError } from "../ui/ErrorModal";
import { SettingField } from "../ui/SettingField";
import { PUBLIC_PLACE_INTERACTION_HELP } from "./publicPlaceInteractionHelp";

type Props = {
  showHeading?: boolean;
  targetId: string;
  targetType: ReportTargetType;
};

export function ReportForm({ showHeading = true, targetId, targetType }: Props) {
  const [message, setMessage] = useState("");
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [reason, setReason] = useState<ReportReason>(DEFAULT_REPORT_REASON);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setOperationError(null);
    setStatus(null);
    try {
      await createReport({
        target_id: targetId,
        target_type: targetType,
        reason,
        message: message.trim() || null,
      });
      setMessage("");
      setReason(DEFAULT_REPORT_REASON);
      setStatus("Zgłoszenie trafiło do redakcji.");
    } catch (error) {
      setOperationError({
        details: errorDetails(error),
        message: "Nie udało się wysłać zgłoszenia do redakcji. Sprawdź połączenie i spróbuj ponownie.",
        title: "Nie udało się wysłać zgłoszenia",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="ui-form report-form" onSubmit={handleSubmit}>
      {showHeading ? (
        <div className="section-heading compact-heading">
          <h3>Zgłoś problem</h3>
        </div>
      ) : null}
      <SettingField
        id="report-reason"
        label="Powód"
        hint={PUBLIC_PLACE_INTERACTION_HELP["report-reason"]}
        helpMode="inline"
      >
        <select value={reason} onChange={(event) => setReason(event.target.value as ReportReason)}>
          {REPORT_REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SettingField>
      <SettingField
        id="report-message"
        label="Wiadomość"
        hint={PUBLIC_PLACE_INTERACTION_HELP["report-message"]}
        helpMode="inline"
      >
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} />
      </SettingField>
      <button type="submit" disabled={isSaving}>
        {isSaving ? "Wysyłanie..." : "Wyślij zgłoszenie"}
      </button>
      {status ? <p className="inline-status">{status}</p> : null}
      {operationError ? <ErrorModal {...operationError} onClose={() => setOperationError(null)} /> : null}
    </form>
  );
}
