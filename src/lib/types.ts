export interface ReleaseAsset {
  name: string;
  download_url: string;
  size: number;
}

export interface ReleaseInfo {
  component: string;
  name: string;
  version: string;
  html_url: string;
  published_at: string;
  assets: ReleaseAsset[];
}

export interface SdInfo {
  root: string | null;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  healthy: boolean;
  issues: string[];
  missing_files: string[];
  duplicate_files: string[];
}

export interface PayloadFile {
  name: string;
  path: string;
  size_kb: number;
  favorite: boolean;
}

export interface PayloadHistoryEntry {
  id: number;
  name: string;
  action: string;
  status: string;
  message?: string;
  created_at: string;
}

export interface DashboardStatus {
  app: {
    name: string;
    version: string;
  };
  sd: SdInfo;
  releases: ReleaseInfo[];
  recent_activity: PayloadHistoryEntry[];
}

export interface RollbackEntry {
  id: number;
  component: string;
  path: string;
  created_at: string;
  status: string;
}

export interface DiagnosticResult {
  status: "success" | "warning" | "error";
  title: string;
  detail: string;
}

export interface BackupEntry {
  name: string;
  path: string;
  created_at: string;
  backup_type: string;
  size_bytes: number;
}

export interface SafetySettings {
  backup_before_update: boolean;
  verify_after_extract: boolean;
  rollback_on_failure: boolean;
}
