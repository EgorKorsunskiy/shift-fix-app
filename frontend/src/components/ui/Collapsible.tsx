import * as Collapsible from "@radix-ui/react-collapsible";
import type { ReactNode } from "react";

export function Collapse({
  open,
  onOpenChange,
  trigger,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange}>
      <Collapsible.Trigger asChild>{trigger}</Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=open]:animate-none">
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
