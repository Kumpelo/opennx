import { useCallback, useEffect, useState } from "react";
import { Download, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { call, normalizeError } from "@/lib/api";
import type { ReleaseInfo, RollbackEntry, SafetySettings } from "@/lib/types";

export default function Updater() {
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);
  const [rollbacks, setRollbacks] = useState<RollbackEntry[]>([]);
  const [safety, setSafety] = useState<SafetySettings | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadRollbacks = useCallback(async () => {
    try {
      setRollbacks(await call<RollbackEntry[]>("list_rollbacks"));
    } catch (error) {
      toast.error(normalizeError(error).message);
    }
  }, []);

  const loadSafety = useCallback(async () => {
    try {
      setSafety(await call<SafetySettings>("get_safety_settings"));
    } catch (error) {
      toast.error(normalizeError(error).message);
    }
  }, []);

  const checkUpdates = useCallback(async () => {
    setBusy("check");
    try {
      setReleases(await call<ReleaseInfo[]>("check_updates"));
      toast.success("Updates checked");
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  async function install(component: string) {
    setBusy(`install:${component}`);
    try {
      await call("install_update", { component });
      toast.success("Update installed");
      await Promise.all([checkUpdates(), loadRollbacks()]);
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  async function rollback(id: number) {
    setBusy(`rollback:${id}`);
    try {
      await call("rollback_update", { id });
      toast.success("Rollback restored");
      await loadRollbacks();
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void checkUpdates();
      void loadRollbacks();
      void loadSafety();
    }, 0);
    return () => window.clearTimeout(id);
  }, [checkUpdates, loadRollbacks, loadSafety]);

  return (
    <>
      <PageHeader
        title="Updates"
        subtitle="Official releases, safe installation and rollback"
        actions={
          <Button variant="outline" onClick={checkUpdates} disabled={busy === "check"}>
            <Download className="size-4" />
            Check updates
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {releases.map((release) => (
            <Card key={release.component}>
              <CardContent className="grid gap-4 p-4 lg:grid-cols-[220px_1fr_230px] lg:items-center">
                <div>
                  <div className="text-base font-semibold capitalize">{displayName(release.component)}</div>
                  <div className="text-xs text-muted-foreground">GitHub official release</div>
                </div>
                <div className="grid gap-4 text-sm sm:grid-cols-4">
                  <InfoCell label="Installed" value="Unknown" />
                  <InfoCell label="Latest" value={release.version} />
                  <InfoCell label="Source" value="Official" />
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge tone="warning">Available</Badge>
                  </div>
                </div>
                <div className="flex gap-2 lg:justify-end">
                  <Button variant="outline" size="sm" disabled={busy === `download:${release.component}`}>
                    Download
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy === `install:${release.component}`}
                    onClick={() => install(release.component)}
                  >
                    <ShieldCheck className="size-4" />
                    Backup & Install
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {releases.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No release data loaded. Use Check updates to fetch official releases.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Safety options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SafetyRow checked={safety?.backup_before_update ?? true} label="Create backup before installing" />
              <SafetyRow checked={safety?.verify_after_extract ?? true} label="Verify files after extraction" />
              <SafetyRow checked={safety?.rollback_on_failure ?? true} label="Enable rollback on failure" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rollback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rollbacks.slice(0, 5).map((entry) => (
                <div key={entry.id} className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium capitalize">{entry.component}</div>
                    <Badge tone={entry.status === "ready" ? "success" : "neutral"}>{entry.status}</Badge>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{entry.path}</div>
                  <Button
                    className="w-full"
                    size="sm"
                    variant="outline"
                    disabled={busy === `rollback:${entry.id}`}
                    onClick={() => rollback(entry.id)}
                  >
                    <RotateCcw className="size-4" />
                    Restore
                  </Button>
                </div>
              ))}
              {rollbacks.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No rollback backups yet. Backup & Install will create restore points here.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function SafetyRow({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={checked ? "text-emerald-400" : "text-muted-foreground"}>{checked ? "✓" : "–"}</span>
      <span>{label}</span>
    </div>
  );
}

function displayName(component: string) {
  if (component === "hbmenu") return "Homebrew Menu";
  return component;
}
