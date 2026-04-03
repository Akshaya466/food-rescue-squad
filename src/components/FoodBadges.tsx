import { Badge } from "@/components/ui/badge";
import { FoodListing } from "@/types";

export function StatusBadge({ status }: { status: FoodListing["status"] }) {
  const styles: Record<string, string> = {
    active: "bg-success/15 text-success border-success/30",
    claimed: "bg-info/15 text-info border-info/30",
    picked_up: "bg-warning/15 text-warning border-warning/30",
    delivered: "bg-primary/15 text-primary border-primary/30",
    expired: "bg-muted text-muted-foreground border-muted",
  };
  return (
    <Badge variant="outline" className={`capitalize text-xs ${styles[status] || ""}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export function UrgencyDot({ level }: { level: FoodListing["urgencyLevel"] }) {
  const colors: Record<string, string> = {
    low: "bg-success",
    medium: "bg-warning",
    high: "bg-urgent animate-pulse",
  };
  return (
    <span className="flex items-center gap-1.5 text-xs capitalize">
      <span className={`h-2 w-2 rounded-full ${colors[level]}`} />
      {level}
    </span>
  );
}

export function CategoryBadge({ category }: { category: FoodListing["category"] }) {
  return (
    <Badge variant="secondary" className="capitalize text-xs">
      {category}
    </Badge>
  );
}
