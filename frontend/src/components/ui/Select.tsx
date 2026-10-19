import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function SelectField({
  value,
  onValueChange,
  options,
  labelledBy,
  disabled,
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  labelledBy?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger
        aria-labelledby={labelledBy}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 text-left text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          className="z-50 max-h-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <Select.Viewport className="p-1">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="flex min-h-11 cursor-pointer items-center justify-between rounded-md px-3 text-sm outline-none data-[highlighted]:bg-slate-100"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check className="h-4 w-4 text-indigo-600" aria-hidden />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
