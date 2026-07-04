import { RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cleanupAdminOrphanMedia, getAdminLocalDataDiagnostics } from "../../api/localData";
import type { LocalDataCleanupReport, LocalDataDiagnostics } from "../../api/types";
import { ErrorModal, errorDetails, type OperationError } from "../ui/ErrorModal";

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  const units = ["KB", "MB", "GB"] as const;
  let nextValue = value / 1024;
  let unitIndex = 0;
  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }
  return `${nextValue.toFixed(nextValue >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function orphanCount(diagnostics: LocalDataDiagnostics | null): number {
  if (!diagnostics) {
    return 0;
  }
  return diagnostics.summary.storage.orphan_private_files + diagnostics.summary.storage.orphan_public_files;
}

function deletedCount(report: LocalDataCleanupReport | null): number {
  if (!report) {
    return 0;
  }
  return report.actions.filter((action) => action.status === "deleted").length;
}

export function AdminMaintenancePanel() {
  const [cleanupReport, setCleanupReport] = useState<LocalDataCleanupReport | null>(null);
  const [diagnostics, setDiagnostics] = useState<LocalDataDiagnostics | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [operationError, setOperationError] = useState<OperationError | null>(null);

  async function refreshDiagnostics() {
    setIsLoading(true);
    try {
      setDiagnostics(await getAdminLocalDataDiagnostics());
    } catch (error) {
      setOperationError({
        details: errorDetails(error),
        message: "Nie udało się pobrać diagnostyki lokalnych danych.",
        title: "Diagnostyka niedostępna",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    getAdminLocalDataDiagnostics()
      .then((report) => {
        if (isActive) {
          setDiagnostics(report);
        }
      })
      .catch((error) => {
        if (isActive) {
          setOperationError({
            details: errorDetails(error),
            message: "Nie udało się pobrać diagnostyki lokalnych danych.",
            title: "Diagnostyka niedostępna",
          });
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  async function handleCleanup() {
    setIsCleaning(true);
    try {
      const report = await cleanupAdminOrphanMedia();
      setCleanupReport(report);
      setDiagnostics(report.diagnostics);
    } catch (error) {
      setOperationError({
        details: errorDetails(error),
        message: "Nie udało się usunąć osieroconych plików.",
        title: "Czyszczenie przerwane",
      });
    } finally {
      setIsCleaning(false);
    }
  }

  const storage = diagnostics?.summary.storage ?? null;
  const issues = diagnostics?.summary.issues.by_severity ?? null;
  const totalOrphans = orphanCount(diagnostics);
  const canCleanup = Boolean(diagnostics && diagnostics.status !== "error" && totalOrphans > 0 && !isCleaning);
  const statusLabel = useMemo(() => {
    if (!diagnostics) {
      return "Sprawdzanie";
    }
    if (diagnostics.status === "ok") {
      return "OK";
    }
    if (diagnostics.status === "warning") {
      return "Wymaga sprzątania";
    }
    return "Błąd";
  }, [diagnostics]);

  if (isLoading && !diagnostics) {
    return (
      <section className="ui-panel admin-maintenance-panel" role="status">
        <p className="ui-help">Sprawdzanie lokalnych danych...</p>
      </section>
    );
  }

  return (
    <section className="ui-panel admin-maintenance-panel" aria-label="Utrzymanie danych">
      <div className="admin-maintenance-status">
        <span className={`ui-status ui-status--${diagnostics?.status === "ok" ? "active" : "draft"}`}>
          {statusLabel}
        </span>
        <button className="ui-button ui-button--ghost" type="button" disabled={isLoading} onClick={refreshDiagnostics}>
          <RefreshCw aria-hidden="true" size={16} />
          Odśwież
        </button>
        <button className="ui-button ui-button--danger" type="button" disabled={!canCleanup} onClick={handleCleanup}>
          <Trash2 aria-hidden="true" size={16} />
          {isCleaning ? "Czyszczenie..." : "Usuń orphan media"}
        </button>
      </div>

      <div className="admin-maintenance-stats">
        <span className="admin-maintenance-stat">
          <span>Orphan media</span>
          <strong>{totalOrphans}</strong>
        </span>
        <span className="admin-maintenance-stat">
          <span>Storage</span>
          <strong>{storage ? formatBytes(storage.private_bytes + storage.public_bytes) : "-"}</strong>
        </span>
        <span className="admin-maintenance-stat">
          <span>Problemy</span>
          <strong>{diagnostics?.summary.issues.total ?? "-"}</strong>
        </span>
      </div>

      {storage ? (
        <dl className="admin-maintenance-details">
          <div>
            <dt>Prywatne</dt>
            <dd>
              {storage.private_files} plików, {storage.orphan_private_files} orphan
            </dd>
          </div>
          <div>
            <dt>Publiczne</dt>
            <dd>
              {storage.public_files} plików, {storage.orphan_public_files} orphan
            </dd>
          </div>
          <div>
            <dt>Diagnostyka</dt>
            <dd>{issues ? `${issues.error} błędów, ${issues.warning} ostrzeżeń, ${issues.info} info` : "-"}</dd>
          </div>
        </dl>
      ) : null}

      {cleanupReport ? (
        <p className="ui-help admin-maintenance-feedback" role="status">
          Usunięto {deletedCount(cleanupReport)} plików.
        </p>
      ) : null}

      {operationError ? <ErrorModal {...operationError} onClose={() => setOperationError(null)} /> : null}
    </section>
  );
}
