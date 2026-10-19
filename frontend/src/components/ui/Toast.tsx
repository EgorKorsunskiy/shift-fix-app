import * as Toast from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ToastItem = { id: number; title: string; tone: "success" | "danger" };

type ToastApi = {
  success: (title: string) => void;
  error: (title: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("ToastProvider missing");
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((title: string, tone: ToastItem["tone"]) => {
    setItems((current) => [...current, { id: Date.now() + Math.random(), title, tone }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (title) => push(title, "success"),
      error: (title) => push(title, "danger"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      <Toast.Provider swipeDirection="right" duration={4000}>
        {children}
        {items.map((item) => (
          <Toast.Root
            key={item.id}
            onOpenChange={(open) => {
              if (!open) setItems((current) => current.filter((entry) => entry.id !== item.id));
            }}
            className={
              item.tone === "success"
                ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm"
                : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm"
            }
          >
            <Toast.Title>{item.title}</Toast.Title>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed bottom-4 right-4 z-50 flex w-[min(100%-2rem,24rem)] flex-col gap-2 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
