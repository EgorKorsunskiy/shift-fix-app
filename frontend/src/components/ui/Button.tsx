import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-60",
    "motion-reduce:transition-none",
    variants[variant],
    sizes[size],
    className,
  );
}

const variants: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
  secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
  }
>(function Button(
  { variant = "primary", size = "md", loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
});
