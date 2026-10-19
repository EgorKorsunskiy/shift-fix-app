import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function TabList({ children }: { children: ReactNode }) {
  return (
    <Tabs.List className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {children}
    </Tabs.List>
  );
}

export function TabTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        "min-h-11 flex-1 rounded-md px-3 text-sm font-medium text-slate-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
        "data-[state=active]:bg-indigo-600 data-[state=active]:text-white",
      )}
    >
      {children}
    </Tabs.Trigger>
  );
}

export const TabsRoot = Tabs.Root;
export const TabContent = Tabs.Content;
