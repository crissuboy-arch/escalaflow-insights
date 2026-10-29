// Local-only adapters (Fase 3) — these tools have NO HTTP service for
// ScalaFlow to call, so their adapters describe the local invocation
// shape and NOTHING ELSE. Nothing here executes anything: the panel must
// render these as "só local" and never as a working remote button.

// ── MKVideos ─────────────────────────────────────────────────────────────
// Audited: CLI `mkivideos` + Athena adapter (branch feat/athena-mkvideos-adapter).
// The Athena adapter reads a mission from stdin and reports status by
// mission id; both run on the MKVideos host, not over HTTP.
export const MKVIDEOS_LOCAL_NOTE =
  "MKVideos corre como CLI no seu host (fila SQLite local). O ScalaFlow não o executa remotamente.";

export function mkvideosReceiveCommand(): string {
  return "mkivideos athena-receive < missao.json";
}

export function mkvideosStatusCommand(missionId: string): string {
  return `mkivideos athena-status --mission ${missionId}`;
}

// ── OpenMontage ──────────────────────────────────────────────────────────
// Audited: Python library + local tools (lib/, tools/, schemas/), no HTTP.
// AGPLv3: no code is copied here — only the interface description below.
// Any network use needs a wrapper service + a license-compliance decision
// BEFORE anything else.
export const OPENMONTAGE_LOCAL_NOTE =
  "OpenMontage é uma biblioteca Python local (AGPLv3), sem endpoint HTTP. " +
  "Usá-lo em rede exige um wrapper de serviço próprio e uma decisão de conformidade AGPL — fora do âmbito do ScalaFlow.";

// ── Criador de App ───────────────────────────────────────────────────────
// Audited: CLI scaffolding — it generates a config JSON + a prompt, not a
// standalone app artifact, and there is no generation endpoint.
export const CRIADOR_APP_LOCAL_NOTE =
  "O Criador de App gera configurações de microapps (JSON + prompt) via CLI; não existe endpoint de geração para o painel chamar.";

export function criadorAppCommand(appName: string, template?: string): string {
  const safeName = appName.replace(/[^A-Za-z0-9_-]/g, "_") || "app";
  return `python create_app.py ${safeName}${template ? ` --template ${template}` : ""}`;
}
