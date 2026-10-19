import * as Switch from "@radix-ui/react-switch";

export function Toggle({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative h-6 w-11 shrink-0 rounded-full bg-slate-200 data-[state=checked]:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[22px] motion-reduce:transition-none" />
      </Switch.Root>
    </label>
  );
}
