export function Avatar({ first, last }: { first: string; last: string }) {
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  return (
    <span
      aria-hidden
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
    >
      {initials}
    </span>
  );
}
