export function ScoreBar({ score }: { score: number }) {
  const width = Math.max(0, Math.min(100, score));
  return (
    <div className="flex min-w-[7rem] items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
        aria-label={String(width)}
      >
        <div className="h-full bg-indigo-600" style={{ width: `${width}%` }} />
      </div>
      <span className="w-7 text-right text-xs tabular-nums text-slate-500">{width}</span>
    </div>
  );
}
