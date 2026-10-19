import { Badge } from "@/components/ui/Badge";

export function QualificationChips({ items }: { items: { code: string; name: string }[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item.code}>{item.name}</Badge>
      ))}
    </span>
  );
}
