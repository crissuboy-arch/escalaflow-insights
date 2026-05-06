import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

type Status = "teste" | "validando" | "escalando" | "quente";
const styles: Record<Status, string> = {
  teste: "bg-muted text-muted-foreground border-border",
  validando: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  escalando: "bg-primary/15 text-primary border-primary/30",
  quente: "border-transparent text-primary-foreground",
};

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useTranslation();
  const style = status === "quente" ? { background: "var(--gradient-primary)" } : undefined;
  return <Badge variant="outline" className={styles[status]} style={style}>{t(`status.${status}`)}</Badge>;
}