import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-slate-200 bg-white px-4 py-10 text-center",
        className,
      )}
    >
      <p className="text-slate-500">{title}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
