import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none", className)}
      aria-hidden
    />
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white" aria-busy>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
