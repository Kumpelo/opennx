import { Info, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="font-semibold tracking-normal">OpenNX</div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild title="Settings">
          <NavLink to="/settings">
            <Settings className="size-4" />
            <span className="sr-only">Settings</span>
          </NavLink>
        </Button>
        <Button variant="ghost" size="icon" title="About">
          <Info className="size-4" />
          <span className="sr-only">About</span>
        </Button>
      </div>
    </header>
  );
}
