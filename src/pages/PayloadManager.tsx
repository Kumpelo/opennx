import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { Download, History, Plus, Play, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { call, normalizeError } from "@/lib/api";
import type { PayloadFile, PayloadHistoryEntry } from "@/lib/types";

const official = [
  { label: "Fusée", name: "fusee.bin", cmd: "download_fusee" },
  { label: "Hekate", name: "hekate_ctcaer.bin", cmd: "download_hekate" },
];

export default function PayloadManager() {
  const [payloads, setPayloads] = useState<PayloadFile[]>([]);
  const [history, setHistory] = useState<PayloadHistoryEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayloadFile | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextPayloads, nextHistory] = await Promise.all([
        call<PayloadFile[]>("list_payloads"),
        call<PayloadHistoryEntry[]>("list_payload_history", { limit: 10 }),
      ]);
      setPayloads(nextPayloads);
      setHistory(nextHistory);
    } catch (error) {
      toast.error(normalizeError(error).message);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  async function handleAdd() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Payloads", extensions: ["bin"] }],
    });
    if (!selected || Array.isArray(selected)) return;
    setBusy("add");
    try {
      await call<PayloadFile>("add_payload", { source: selected });
      toast.success("Payload added");
      await load();
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleInject(name: string) {
    setBusy(`inject:${name}`);
    try {
      await call("inject_payload", { name });
      toast.success("Payload injected");
      await load();
    } catch (error) {
      toast.error(normalizeError(error).message);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function handleFavorite(name: string) {
    setBusy(`favorite:${name}`);
    try {
      await call("set_favorite_payload", { name });
      await load();
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(`delete:${deleteTarget.name}`);
    try {
      await call("delete_payload", { name: deleteTarget.name });
      toast.success("Payload deleted");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload(name: string, cmd: string) {
    setBusy(`download:${name}`);
    try {
      await call<string>(cmd);
      toast.success("Payload downloaded");
      await load();
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Payloads"
        subtitle="RCM payload library and injection history"
        actions={
          <>
            <Button variant="outline" onClick={load}>
              Refresh
            </Button>
            <Button onClick={handleAdd} disabled={busy === "add"}>
              <Plus className="size-4" />
              Add payload
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Local library</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_110px_110px_190px] border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
              <div>Name</div>
              <div>Size</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            {payloads.map((payload) => (
              <div
                key={payload.path}
                className="grid grid-cols-[1fr_110px_110px_190px] items-center border-b border-border px-4 py-3 text-sm last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{payload.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{payload.path}</div>
                </div>
                <div className="text-muted-foreground">{payload.size_kb} KB</div>
                <div>{payload.favorite ? <Badge tone="success">Favorite</Badge> : <Badge>Ready</Badge>}</div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    disabled={busy === `inject:${payload.name}`}
                    onClick={() => handleInject(payload.name)}
                  >
                    <Play className="size-4" />
                    Inject
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    disabled={busy === `favorite:${payload.name}`}
                    onClick={() => handleFavorite(payload.name)}
                  >
                    <Star className="size-4" />
                  </Button>
                  <Button size="icon-sm" variant="destructive" onClick={() => setDeleteTarget(payload)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            {payloads.length === 0 && (
              <div className="px-4 py-10 text-sm text-muted-foreground">
                Add a .bin payload or download an official payload.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Official payloads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {official.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="truncate text-xs text-muted-foreground">{item.name}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === `download:${item.name}`}
                    onClick={() => handleDownload(item.name, item.cmd)}
                  >
                    <Download className="size-4" />
                    Download
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4" />
                History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{entry.name}</div>
                    <div className="text-xs text-muted-foreground">{entry.action}</div>
                  </div>
                  <Badge tone={entry.status === "success" ? "success" : "danger"}>{entry.status}</Badge>
                </div>
              ))}
              {history.length === 0 && <div className="text-sm text-muted-foreground">No activity yet</div>}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete payload"
        description={`This removes ${deleteTarget?.name ?? "the payload"} from the local library.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
