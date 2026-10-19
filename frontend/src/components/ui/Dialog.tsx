import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow-sm",
            "focus:outline-none",
            className,
          )}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="text-xl font-semibold text-slate-900">{title}</Dialog.Title>
            <Dialog.Close className="min-h-11 min-w-11 rounded-md text-sm text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
              {t("common.close")}
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description className="mb-4 text-sm text-slate-500">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
