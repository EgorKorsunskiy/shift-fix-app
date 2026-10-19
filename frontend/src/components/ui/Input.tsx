import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900",
        "placeholder:text-slate-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1" htmlFor={htmlFor}>
      <span className="text-sm font-medium text-slate-900">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
