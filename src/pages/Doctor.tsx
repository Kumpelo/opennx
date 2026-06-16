import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleX, Stethoscope, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { call, normalizeError } from "@/lib/api";
import type { DiagnosticResult } from "@/lib/types";

export default function Doctor() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      setResults(await call<DiagnosticResult[]>("run_doctor"));
    } catch (error) {
      toast.error(normalizeError(error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void run();
    }, 0);
    return () => window.clearTimeout(id);
  }, [run]);

  return (
    <>
      <PageHeader
        title="Doctor"
        subtitle="Run a safety scan of your SD card and setup"
        actions={
          <Button onClick={run} disabled={busy}>
            <Stethoscope className="size-4" />
            Run diagnostics
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {results.map((result) => (
              <div key={`${result.status}:${result.title}`} className="flex items-start gap-3 py-3">
                <StatusIcon status={result.status} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{result.title}</div>
                  <div className="text-sm text-muted-foreground">{result.detail}</div>
                </div>
                <Badge tone={tone(result.status)}>{result.status}</Badge>
              </div>
            ))}
            {results.length === 0 && (
              <div className="py-10 text-sm text-muted-foreground">No diagnostic results yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function StatusIcon({ status }: { status: DiagnosticResult["status"] }) {
  if (status === "success") return <CheckCircle2 className="mt-0.5 size-5 text-emerald-400" />;
  if (status === "error") return <CircleX className="mt-0.5 size-5 text-red-400" />;
  return <TriangleAlert className="mt-0.5 size-5 text-amber-400" />;
}

function tone(status: DiagnosticResult["status"]) {
  if (status === "success") return "success";
  if (status === "error") return "danger";
  return "warning";
}
