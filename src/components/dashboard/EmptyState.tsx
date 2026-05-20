import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, WifiOff, Ban } from "lucide-react";

interface EmptyStateProps {
  icon?: "empty" | "error" | "offline" | "limit";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = "empty", title, description, actionLabel, onAction }: EmptyStateProps) {
  const icons = { empty: RefreshCw, error: AlertCircle, offline: WifiOff, limit: Ban };
  const Icon = icons[icon];

  return (
    <Card className="card-premium">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <Icon className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        {actionLabel && onAction && (
          <Button variant="outline" size="sm" onClick={onAction}>{actionLabel}</Button>
        )}
      </CardContent>
    </Card>
  );
}
