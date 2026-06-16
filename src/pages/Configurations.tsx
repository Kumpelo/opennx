import { Download, FileArchive, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";

const configs = [
  { name: "Atmosphère", file: "atmosphere/config/system_settings.ini" },
  { name: "Exosphere", file: "exosphere.ini" },
  { name: "Hekate", file: "bootloader/hekate_ipl.ini" },
];

const profiles = ["Portable", "Docked", "Safe Mode", "Development"];

export default function Configurations() {
  return (
    <>
      <PageHeader title="Configurations" subtitle="Config files, exports and setup profiles" />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Configuration files</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {configs.map((config) => (
              <div key={config.name} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{config.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{config.file}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled>
                    <Download className="size-4" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    <Upload className="size-4" />
                    Import
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    <FileArchive className="size-4" />
                    Backup
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profiles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profiles.map((profile) => (
              <div key={profile} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm">{profile}</span>
                <Badge tone={profile === "Safe Mode" ? "success" : "neutral"}>
                  {profile === "Safe Mode" ? "Recommended" : "Template"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
