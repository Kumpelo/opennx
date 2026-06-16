import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, FolderOpen, HardDrive, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { call, normalizeError } from "@/lib/api";
import type { SdInfo } from "@/lib/types";

interface BackupResult {
  path: string;
  files: number;
  bytes: number;
}

export default function SdManager() {
  const { t } = useTranslation();
  const [sd, setSd] = useState<SdInfo | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSd(await call<SdInfo>("get_sd_status"));
    } catch (error) {
      toast.error(normalizeError(error).message);
    }
  }, []);

  async function selectRoot() {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    setBusy("select");
    try {
      await call("set_sd_root", { path: selected });
      await load();
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  async function analyze() {
    setBusy("analyze");
    try {
      setSd(await call<SdInfo>("analyze_sd"));
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  async function backup() {
    setBusy("backup");
    try {
      const result = await call<BackupResult>("create_sd_backup");
      setLastBackup(result.path);
      toast.success(t("sd.backupCreated"));
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    if (!lastBackup) return;
    setBusy("restore");
    try {
      await call<BackupResult>("restore_sd_backup", { backupPath: lastBackup });
      toast.success(t("common.success"));
      await load();
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const usedPercent = sd && sd.total_gb > 0 ? (sd.used_gb / sd.total_gb) * 100 : 0;

  return (
    <>
      <PageHeader
        title={t("sd.title")}
        subtitle={t("sd.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={selectRoot} disabled={busy === "select"}>
              <FolderOpen className="size-4" />
              {t("sd.selectRoot")}
            </Button>
            <Button variant="outline" onClick={analyze} disabled={busy === "analyze"}>
              <Search className="size-4" />
              {t("sd.analyze")}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>{sd?.root ? t("sd.selectedRoot") : t("sd.noRoot")}</span>
            <Badge tone={sd?.healthy ? "success" : "warning"}>
              {sd?.healthy ? t("common.healthy") : t("common.issues")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="truncate text-sm text-muted-foreground">{sd?.root ?? t("sd.noRoot")}</div>
          <ProgressBar value={usedPercent} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title={t("sd.total")} value={`${sd?.total_gb ?? 0} ${t("common.gb")}`} icon={<HardDrive className="size-4" />} />
        <MetricCard title={t("sd.used")} value={`${sd?.used_gb ?? 0} ${t("common.gb")}`} icon={<HardDrive className="size-4" />} />
        <MetricCard title={t("sd.free")} value={`${sd?.free_gb ?? 0} ${t("common.gb")}`} icon={<HardDrive className="size-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("sd.missing")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(sd?.missing_files ?? []).map((entry) => (
              <Badge key={entry} tone="warning">{entry}</Badge>
            ))}
            {sd?.missing_files.length === 0 && <p className="text-sm text-muted-foreground">{t("common.healthy")}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("sd.duplicates")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(sd?.duplicate_files ?? []).map((entry) => (
              <Badge key={entry} tone="neutral">{entry}</Badge>
            ))}
            {sd?.duplicate_files.length === 0 && <p className="text-sm text-muted-foreground">{t("common.healthy")}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sd.backup")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 truncate text-sm text-muted-foreground">
            {lastBackup ?? t("updater.noBackups")}
          </div>
          <div className="flex gap-2">
            <Button onClick={backup} disabled={busy === "backup"}>
              <Archive className="size-4" />
              {t("sd.backup")}
            </Button>
            <Button variant="outline" onClick={restore} disabled={!lastBackup || busy === "restore"}>
              <RotateCcw className="size-4" />
              {t("sd.restore")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
