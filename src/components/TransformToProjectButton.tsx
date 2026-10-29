import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, Check, Eye, Clock } from "lucide-react";
import { checkTransformStatusFn, transformToProjectFn } from "@/lib/cris-os/transform.functions";

interface TransformToProjectButtonProps {
  adLibraryId?: string | null;
  adUrl?: string | null;
  /** "cta" = prominent labeled button (Análise IA). "icon" = compact icon-only
   *  button matching the ghost action icons already used in Ofertas Escaladas. */
  variant?: "cta" | "icon";
}

type State = "checking" | "idle" | "sending" | "sent" | "needsReview" | "error";

// Commercial-facing action: sends the opportunity into the user's execution
// flow. Deliberately no mention of the underlying infrastructure anywhere
// in this component — labels, toasts, and errors are all product-facing.
export function TransformToProjectButton({
  adLibraryId,
  adUrl,
  variant = "cta",
}: TransformToProjectButtonProps) {
  const [state, setState] = useState<State>("checking");
  // Real handoff_id once SENT, propagated by the button itself so every
  // consumer (minerar card, Análise IA, Ofertas Escaladas) gets "Ver
  // Projeto" navigation for free, with no duplicated lookup logic.
  const [handoffId, setHandoffId] = useState<string | null>(null);
  const checkStatus = useServerFn(checkTransformStatusFn);
  const transform = useServerFn(transformToProjectFn);

  const identity = { adLibraryId: adLibraryId ?? undefined, adUrl: adUrl ?? undefined };
  const hasIdentity = !!(adLibraryId || adUrl);

  useEffect(() => {
    let cancelled = false;
    if (!hasIdentity) {
      setState("idle");
      return;
    }
    setState("checking");
    checkStatus({ data: identity })
      .then((res) => {
        if (cancelled) return;
        if (res.sent) {
          setHandoffId(res.handoffId);
          setState("sent");
        } else if (res.needsReview) {
          // HARD RULE: NEEDS_REVIEW is pending review, never a concluded
          // project — it gets its own state, never the "sent" checkmark.
          setHandoffId(res.handoffId);
          setState("needsReview");
        } else {
          setState("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setState("idle");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adLibraryId, adUrl]);

  const onClick = async () => {
    if (state !== "idle" || !hasIdentity) return;
    setState("sending");
    try {
      const res = await transform({ data: identity });
      if (res.ok) {
        setHandoffId(res.handoffId);
        if ("needsReview" in res && res.needsReview) {
          setState("needsReview");
          toast.success("Enviado — aguardando revisão.");
        } else {
          setState("sent");
          toast.success("Projeto criado a partir desta oportunidade.");
        }
      } else {
        setState("idle");
        toast.error(res.error || "Não foi possível enviar. Tente novamente.");
      }
    } catch {
      setState("idle");
      toast.error("Não foi possível enviar. Tente novamente.");
    }
  };

  const disabled = state !== "idle" || !hasIdentity;
  // "Ver Projeto" is a plain navigation to the existing Projetos area — it
  // must never call transformToProjectFn, send a handoff, or touch status.
  // Shown for both sent and needsReview: a pending-review handoff is still
  // viewable, just never shown as concluded.
  const showViewProject = (state === "sent" || state === "needsReview") && !!handoffId;

  if (variant === "icon") {
    return (
      <>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClick}
          disabled={disabled}
          title={
            state === "sent"
              ? "Projeto já criado a partir desta oportunidade"
              : state === "needsReview"
                ? "Aguardando revisão"
                : "Transformar em Projeto"
          }
        >
          {state === "sending" || state === "checking" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : state === "sent" ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : state === "needsReview" ? (
            <Clock className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Zap className="h-3.5 w-3.5 text-primary" />
          )}
        </Button>
        {showViewProject && (
          <Link
            to="/projetos/handoff/$handoffId"
            params={{ handoffId: handoffId! }}
            search={{} as never}
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="sm" variant="ghost" title="Ver Projeto">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={onClick}
        disabled={disabled}
        title={
          state === "sent"
            ? "Projeto já criado a partir desta oportunidade."
            : state === "needsReview"
              ? "Aguardando revisão."
              : "Envie esta oportunidade para o seu fluxo de execução."
        }
      >
        {state === "sending" ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Enviando...
          </>
        ) : state === "sent" ? (
          <>
            <Check className="mr-1 h-3 w-3" /> Projeto já criado
          </>
        ) : state === "needsReview" ? (
          <>
            <Clock className="mr-1 h-3 w-3" /> Aguardando revisão
          </>
        ) : (
          <>
            <Zap className="mr-1 h-3 w-3" /> Transformar em Projeto
          </>
        )}
      </Button>
      {showViewProject && (
        <Link
          to="/projetos/handoff/$handoffId"
          params={{ handoffId: handoffId! }}
          search={{} as never}
          onClick={(e) => e.stopPropagation()}
        >
          <Button size="sm" variant="outline" title="Abrir o projeto criado a partir desta oportunidade">
            <Eye className="mr-1 h-3 w-3" /> Ver Projeto
          </Button>
        </Link>
      )}
    </>
  );
}
