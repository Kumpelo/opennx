import { useCallback, useEffect, useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { call, normalizeError } from "@/lib/api";
import type { BackupEntry } from "@/lib/types";

export default function Backups() {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBackups(await call<BackupEntry[]>("list_sd_backups"));
    } catch (error) {
      toast.error(normalizeError(error).message);
    }
  }, []);

  async function createBackup() {
    setBusy("create");
    try {
      await call("create_sd_backup");
      toast.success("Backup created");
      await load();
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  async function restore(path: string) {
    setBusy(`restore:${path}`);
    try {
      await call("restore_sd_backup", { backupPath: path });
      toast.success("Backup restored");
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(path: string) {
    setBusy(`delete:${path}`);
    try {
      await call("delete_sd_backup", { backupPath: path });
      toast.success("Backup deleted");
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

  return (
    <>
      <PageHeader
        title="Backups"
        subtitle="Manual and pre-update restore points"
        actions={
          <Button onClick={createBackup} disabled={busy === "create"}>
            <Archive className="size-4" />
            Create backup
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Backup history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_180px_120px_180px] border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
            <div>Date</div>
            <div>Type</div>
            <div>Size</div>
            <div className="text-right">Actions</div>
          </div>
          {backups.map((backup) => (
            <div
              key={backup.path}
              className="grid grid-cols-[1fr_180px_120px_180px] items-center border-b border-border px-4 py-3 text-sm last:border-b-0"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{backup.created_at}</div>
                <div className="truncate text-xs text-muted-foreground">{backup.path}</div>
              </div>
              <div className="text-muted-foreground">{backup.backup_type}</div>
              <div className="text-muted-foreground">{formatSize(backup.size_bytes)}</div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === `restore:${backup.path}`}
                  onClick={() => restore(backup.path)}
                >
                  <RotateCcw className="size-4" />
                  Restore
                </Button>
                <Button
                  size="icon-sm"
                  variant="destructive"
                  disabled={busy === `delete:${backup.path}`}
                  onClick={() => remove(backup.path)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          {backups.length === 0 && (
            <div className="px-4 py-10 text-sm text-muted-foreground">No backups found</div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}
