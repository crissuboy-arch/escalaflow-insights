import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={`card-premium overflow-hidden ${className ?? ""}`}>
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-2 w-32 rounded" />
      </CardContent>
    </Card>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-primary/15 bg-background/40 p-3">
          <div className="space-y-2 min-w-0 flex-1">
            <Skeleton className="h-4 w-3/5 rounded" />
            <Skeleton className="h-3 w-2/5 rounded" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="h-72 flex items-center justify-center">
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  );
}
