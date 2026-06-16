import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { call, normalizeError } from "@/lib/api";
import type { SafetySettings } from "@/lib/types";

interface SettingsState {
  language: string;
  sd_root: string | null;
}

export default function Settings() {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [safety, setSafety] = useState<SafetySettings | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextSettings, nextSafety] = await Promise.all([
        call<SettingsState>("get_settings"),
        call<SafetySettings>("get_safety_settings"),
      ]);
      setSettings(nextSettings);
      setSafety(nextSafety);
    } catch (error) {
      toast.error(normalizeError(error).message);
    }
  }, []);

  async function setLanguage(language: string) {
    try {
      await i18n.changeLanguage(language);
      setSettings(await call<SettingsState>("set_language", { language }));
    } catch (error) {
      toast.error(normalizeError(error).message);
    }
  }

  async function selectSdRoot() {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    try {
      setSettings(await call<SettingsState>("set_sd_root", { path: selected }));
      toast.success("SD root updated");
    } catch (error) {
      toast.error(normalizeError(error).message);
    }
  }

  async function updateSafety(next: SafetySettings) {
    setSafety(next);
    try {
      setSafety(await call<SafetySettings>("set_safety_settings", { settings: next }));
    } catch (error) {
      toast.error(normalizeError(error).message);
      await load();
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
      <PageHeader title="Settings" subtitle="Application behavior, storage and safety defaults" />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Language" value={settings?.language === "es" ? "Spanish" : "English"}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLanguage(settings?.language === "es" ? "en" : "es")}
              >
                <Languages className="size-4" />
                Change
              </Button>
            </SettingRow>
            <Separator />
            <SettingRow label="Theme" value="Dark" />
            <Separator />
            <SettingRow label="Startup page" value="Overview" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="SD Root" value={settings?.sd_root ?? "Not selected"}>
              <Button size="sm" variant="outline" onClick={selectSdRoot}>
                <FolderOpen className="size-4" />
                Select
              </Button>
            </SettingRow>
            <Separator />
            <SettingRow label="Downloads" value="App cache" />
            <Separator />
            <SettingRow label="Backups" value="App data" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Safety</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {safety && (
              <>
                <SafetyToggle
                  label="Create backup before update"
                  checked={safety.backup_before_update}
                  onChange={(checked) => updateSafety({ ...safety, backup_before_update: checked })}
                />
                <SafetyToggle
                  label="Verify extracted files"
                  checked={safety.verify_after_extract}
                  onChange={(checked) => updateSafety({ ...safety, verify_after_extract: checked })}
                />
                <SafetyToggle
                  label="Enable rollback"
                  checked={safety.rollback_on_failure}
                  onChange={(checked) => updateSafety({ ...safety, rollback_on_failure: checked })}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SettingRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="truncate text-xs text-muted-foreground">{value}</div>
      </div>
      {children}
    </div>
  );
}

function SafetyToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm"
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span>{label}</span>
      <span className={checked ? "text-emerald-400" : "text-muted-foreground"}>
        {checked ? "Enabled" : "Disabled"}
      </span>
    </button>
  );
}
