export function WorkerName({ first, last }: { first: string; last: string }) {
  return (
    <span className="font-medium text-slate-900">
      {first} {last}
    </span>
  );
}
