import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, CheckCircle2, Download, HardDrive, Rocket, ShieldCheck, TriangleAlert } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/PageHeader";
import { call, normalizeError } from "@/lib/api";
import type { DashboardStatus, ReleaseInfo } from "@/lib/types";
import atmosphereLogo from "@/assets/atmosphere.svg";

const components = [
  { id: "atmosphere", label: "Atmosphère", logo: atmosphereLogo },
  { id: "hekate", label: "Hekate" },
  { id: "hbmenu", label: "Homebrew Menu" },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<DashboardStatus | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await call<DashboardStatus>("get_dashboard_status"));
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

  const sd = status?.sd;
  const usedPercent = sd && sd.total_gb > 0 ? (sd.used_gb / sd.total_gb) * 100 : 0;

  return (
    <>
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        {components.map((component) => (
          <ComponentPanel
            key={component.id}
            label={component.label}
            logo={component.logo}
            release={status?.releases.find((release) => release.component === component.id)}
          />
        ))}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="size-4 text-violet-300" />
              SD Card
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoCell label="Root" value={sd?.root ?? "Not selected"} />
              <InfoCell label="Filesystem" value="exFAT" />
              <InfoCell label="Free space" value={`${sd?.free_gb ?? 0} GB`} />
              <InfoCell label="Used" value={`${sd?.used_gb ?? 0} GB`} />
            </div>
            <ProgressBar value={usedPercent} />
            <Badge tone={sd?.healthy ? "success" : "warning"}>
              {sd?.healthy ? "Ready" : "Needs attention"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {(status?.recent_activity ?? []).length > 0 ? (
              <div className="divide-y divide-border">
                {(status?.recent_activity ?? []).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {entry.status === "success" ? (
                        <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
                      ) : (
                        <TriangleAlert className="size-5 shrink-0 text-amber-400" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{entry.name}</div>
                        <div className="text-xs text-muted-foreground">{entry.action}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{entry.created_at}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-sm text-muted-foreground">
                <div>No recent activity.</div>
                <div>Actions such as updates, backups and diagnostics will appear here.</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <QuickAction to="/updates" icon={Download} title="Check for updates" detail="Search official releases" />
            <QuickAction to="/backups" icon={Archive} title="Create backup" detail="Back up your current setup" />
            <QuickAction to="/doctor" icon={ShieldCheck} title="Run Doctor" detail="Check your environment" />
            <QuickAction to="/payloads" icon={Rocket} title="Manage payloads" detail="Add, remove or inject payloads" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-4">
          <InfoCell label="OS" value={navigator.platform || "Unknown"} />
          <InfoCell label="OpenNX Version" value={status?.app.version ?? "0.0.1"} />
          <InfoCell label="Tauri" value="2.x" />
          <InfoCell label="Rust" value="1.77+" />
        </CardContent>
      </Card>
    </>
  );
}

function ComponentPanel({
  label,
  logo,
  release,
}: {
  label: string;
  logo?: string;
  release?: ReleaseInfo;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {logo && <img src={logo} alt="" className="size-6" />}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoCell label="Installed" value="Unknown" />
          <InfoCell label="Latest" value={release?.version ?? "Checking"} />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Status</div>
          <Badge tone={release ? "warning" : "neutral"}>
            {release ? "Update available" : "Unknown"}
          </Badge>
        </div>
        <Button className="w-fit px-3" size="sm" variant="outline" asChild>
          <NavLink to="/updates">Update</NavLink>
        </Button>
      </CardContent>
    </Card>
  );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  detail,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) {
  return (
    <NavLink to={to} className="flex items-center gap-3 py-3">
      <div className="flex size-9 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </NavLink>
  );
}
