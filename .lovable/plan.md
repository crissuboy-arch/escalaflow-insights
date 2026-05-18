## Diagnóstico

A tela "Escala do Produto" está piscando (conteúdo aparece e some) por duas causas combinadas, introduzidas nas últimas mudanças:

**1. Guard de auth duplicado na rota `/escala`**
`src/routes/_authenticated/escala.tsx` tem um `beforeLoad` que chama `supabase.auth.getUser()` e faz `throw redirect({ to: "/login" })` se vazio. Mas a rota já vive sob o layout `_authenticated`, que **também** valida via `useAuth()` e redireciona. Na primeira visita, `getUser()` chega antes do `AuthProvider` hidratar → a rota redireciona pra `/login`, o layout monta, o session hidrata, volta pra `/escala` → o conteúdo aparece, some, e aparece de novo. Esse é o "piscar" principal.

**2. `<Tooltip>` aninhado dentro de `<button>` em `PlatformPicker`**
Em `src/components/pipeline/scale/PlatformPicker.tsx` linhas 42–62, cada chip de placement é um `<button>` que contém `<Tooltip><TooltipTrigger asChild><Info/></TooltipTrigger></Tooltip>`. O Radix `TooltipTrigger asChild` injeta handlers de foco/pointer no ícone, e o `<button>` externo também captura esses eventos — ao passar o mouse o tooltip abre/fecha em loop, dando flicker visual quando o usuário move o mouse sobre os chips.

## Correções

### Arquivo 1 — `src/routes/_authenticated/escala.tsx`
Remover o `beforeLoad` redundante. O layout `_authenticated.tsx` já é o guard único de auth.

```ts
export const Route = createFileRoute("/_authenticated/escala")({
  component: EscalaHubPage,
});
```

### Arquivo 2 — `src/components/pipeline/scale/PlatformPicker.tsx`
Tirar o `Tooltip` de dentro do `<button>`. Duas opções, vou aplicar a (a):

(a) Mover o `title` nativo para o próprio `<button>` (passa o `hint` como atributo `title`) e remover o `Tooltip`/`Info`/`TooltipProvider`. Zero risco de re-render loop, mantém a dica via hover do browser.

(b) Manter visual com Info, mas trocar `<button>` por `<div role="button" tabIndex={0}>` e deixar o Tooltip lateral fora do clicável.

Vou usar (a) por simplicidade — remove o `TooltipProvider`, o import de `Info`, e renderiza `<button title={p.hint}>{p.label}</button>`.

### Verificação
Após aplicar:
- Abrir `/escala` direto via URL → não deve mais piscar/voltar pra login.
- Passar o mouse sobre chips de placements (Meta · Reels etc.) → sem flicker.
- Resto do módulo (formulário, países, moeda, gerar plano) intacto.

## Fora de escopo
- Não mexer em `AuthProvider`, sidebar, outros módulos, nem no resto do fluxo da Escala (forms, IA, persistência).
