import { NavLink } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArchiveRestore,
  Download,
  LayoutDashboard,
  Rocket,
  Settings,
  Settings2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { call } from "@/lib/api";
import type { SdInfo } from "@/lib/types";

const mainItems: { label: string; to: string; icon: LucideIcon }[] = [
  { label: "nav.dashboard", to: "/", icon: LayoutDashboard },
  { label: "nav.updates", to: "/updates", icon: Download },
  { label: "nav.payloads", to: "/payloads", icon: Rocket },
  { label: "nav.configurations", to: "/configurations", icon: Settings2 },
  { label: "nav.doctor", to: "/doctor", icon: ShieldCheck },
  { label: "nav.backups", to: "/backups", icon: ArchiveRestore },
];

const secondaryItems: { label: string; to: string; icon: LucideIcon }[] = [
  { label: "nav.settings", to: "/settings", icon: Settings },
];

function NavItem({ label, to, icon: Icon }: { label: string; to: string; icon: LucideIcon }) {
  const { t } = useTranslation();

  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        )
      }
    >
      <Icon className="size-4" />
      {t(label)}
    </NavLink>
  );
}

export default function Sidebar() {
  const [sd, setSd] = useState<SdInfo | null>(null);

  const loadSd = useCallback(async () => {
    try {
      setSd(await call<SdInfo>("get_sd_status"));
    } catch {
      setSd(null);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadSd();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadSd]);

  const usedPercent = sd && sd.total_gb > 0 ? (sd.used_gb / sd.total_gb) * 100 : 0;

  async function chooseSdRoot() {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    await call("set_sd_root", { path: selected });
    await loadSd();
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <nav className="flex-1 space-y-1 px-2 py-3">
        {mainItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <Separator className="my-3" />

        {secondaryItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              "size-2 rounded-full",
              sd?.root ? "bg-emerald-400" : "bg-muted-foreground",
            )}
          />
          <span className="font-medium">{sd?.root ? "SD Connected" : "SD Not Selected"}</span>
        </div>
        <div className="truncate text-xs text-muted-foreground">{sd?.root ?? "Select SD root"}</div>
        {sd?.root && (
          <div className="space-y-2">
            <ProgressBar value={usedPercent} />
            <div className="text-xs text-muted-foreground">{sd.free_gb} GB free</div>
          </div>
        )}
        {!sd?.root && (
          <Button className="w-full" size="sm" variant="outline" onClick={chooseSdRoot}>
            Choose SD Root
          </Button>
        )}
      </div>
    </aside>
  );
}
