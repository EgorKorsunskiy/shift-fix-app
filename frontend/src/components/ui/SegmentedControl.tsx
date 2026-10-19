export function SegmentedControl({
  value,
  onChange,
  options,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  options: number[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={
              selected
                ? "min-h-11 min-w-11 flex-1 rounded-md bg-indigo-600 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                : "min-h-11 min-w-11 flex-1 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
