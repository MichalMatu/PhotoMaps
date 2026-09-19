type LocalDataStatus = "ok" | "warning" | "error";
type LocalDataIssueSeverity = "error" | "warning" | "info";

type LocalDataIssueCounts = {
  error: number;
  warning: number;
  info: number;
};

type LocalDataIssueSummary = {
  total: number;
  by_severity: LocalDataIssueCounts;
};

type LocalDataIssue = {
  severity: LocalDataIssueSeverity;
  code: string;
  target: string;
  message: string;
};

type LocalDataMediaSummary = {
  records: number;
  approved: number;
  pending: number;
  rejected: number;
  unknown_status: number;
};

type LocalDataPlaceSummary = {
  records: number;
  published: number;
  draft: number;
  archived: number;
  unknown_status: number;
};

type LocalDataStorageSummary = {
  private_files: number;
  public_files: number;
  orphan_private_files: number;
  orphan_public_files: number;
  private_bytes: number;
  public_bytes: number;
};

export type LocalDataDiagnostics = {
  generated_at: string;
  status: LocalDataStatus;
  summary: {
    photos: LocalDataMediaSummary;
    memories: LocalDataMediaSummary;
    places: LocalDataPlaceSummary;
    public_payloads: {
      checked: number;
    };
    storage: LocalDataStorageSummary;
    issues: LocalDataIssueSummary;
  };
  issues: LocalDataIssue[];
};

export type LocalDataCleanupReport = {
  mode: "apply" | "dry-run";
  status: LocalDataStatus;
  actions: Array<{
    action: "delete_file";
    applied: boolean;
    relative_path: string;
    storage: "private" | "public";
    status: "planned" | "deleted" | "missing" | "not-file";
  }>;
  diagnostics: LocalDataDiagnostics;
  diagnostics_before: LocalDataDiagnostics | null;
};
