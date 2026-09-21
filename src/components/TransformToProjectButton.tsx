import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, Check } from "lucide-react";
import { checkTransformStatusFn, transformToProjectFn } from "@/lib/cris-os/transform.functions";

interface TransformToProjectButtonProps {
  adLibraryId?: string | null;
  adUrl?: string | null;
  /** "cta" = prominent labeled button (Análise IA). "icon" = compact icon-only
   *  button matching the ghost action icons already used in Ofertas Escaladas. */
  variant?: "cta" | "icon";
}

type State = "checking" | "idle" | "sending" | "sent" | "error";

// Commercial-facing action: sends the opportunity into the user's execution
// flow. Deliberately no mention of the underlying infrastructure anywhere
// in this component — labels, toasts, and errors are all product-facing.
export function TransformToProjectButton({
  adLibraryId,
  adUrl,
  variant = "cta",
}: TransformToProjectButtonProps) {
  const [state, setState] = useState<State>("checking");
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
        if (!cancelled) setState(res.sent ? "sent" : "idle");
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
        setState("sent");
        toast.success("Oportunidade enviada com sucesso.");
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

  if (variant === "icon") {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={onClick}
        disabled={disabled}
        title={state === "sent" ? "Já enviado para execução" : "Transformar em Projeto"}
      >
        {state === "sending" || state === "checking" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : state === "sent" ? (
          <Check className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Zap className="h-3.5 w-3.5 text-primary" />
        )}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      title={
        state === "sent"
          ? "Já enviado para execução"
          : "Envie esta oportunidade para o seu fluxo de execução."
      }
    >
      {state === "sending" ? (
        <>
          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Enviando...
        </>
      ) : state === "sent" ? (
        <>
          <Check className="mr-1 h-3 w-3" /> Enviado para execução
        </>
      ) : (
        <>
          <Zap className="mr-1 h-3 w-3" /> Transformar em Projeto
        </>
      )}
    </Button>
  );
}
