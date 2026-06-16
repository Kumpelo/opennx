import { cn } from "@/lib/utils";

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === "vertical" ? "h-full w-px" : "h-px w-full",
        "bg-border",
        className,
      )}
      {...props}
    />
  );
}
