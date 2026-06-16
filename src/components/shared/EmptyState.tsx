import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-52 flex-col items-center justify-center gap-4 text-center">
        <div className="text-muted-foreground">{icon}</div>
        <p className="max-w-sm text-sm text-muted-foreground">{title}</p>
        {action}
      </CardContent>
    </Card>
  );
}
