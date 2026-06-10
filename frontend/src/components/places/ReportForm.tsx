import { FormEvent, useState } from "react";

import { createReport, type ReportTargetType } from "../../api/client";
import { ErrorModal, errorDetails, type OperationError } from "../ui/ErrorModal";

type Props = {
  showHeading?: boolean;
  targetId: string;
  targetType: ReportTargetType;
};

export function ReportForm({ showHeading = true, targetId, targetType }: Props) {
  const [message, setMessage] = useState("");
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [reason, setReason] = useState("wrong_data");
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
      setReason("wrong_data");
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
    <form className="report-form" onSubmit={handleSubmit}>
      {showHeading ? (
        <div className="section-heading compact-heading">
          <h3>Zgłoś problem</h3>
        </div>
      ) : null}
      <label>
        Powód
        <select value={reason} onChange={(event) => setReason(event.target.value)}>
          <option value="wrong_data">Nieaktualne dane</option>
          <option value="bad_photo">Problem ze zdjęciem</option>
          <option value="closed_place">Miejsce już nie działa</option>
          <option value="other">Inny powód</option>
        </select>
      </label>
      <label>
        Wiadomość
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} />
      </label>
      <button type="submit" disabled={isSaving}>
        {isSaving ? "Wysyłanie..." : "Wyślij zgłoszenie"}
      </button>
      {status ? <p className="inline-status">{status}</p> : null}
      {operationError ? <ErrorModal {...operationError} onClose={() => setOperationError(null)} /> : null}
    </form>
  );
}
