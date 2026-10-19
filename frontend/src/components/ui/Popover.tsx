import * as Popover from "@radix-ui/react-popover";
import type { ReactNode } from "react";

export function PopoverRoot({
  open,
  onOpenChange,
  trigger,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          className="z-50 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-sm focus:outline-none"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
