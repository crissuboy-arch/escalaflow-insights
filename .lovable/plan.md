## Plano de implementação

### Prioridade 1 — Corrigir continuidade real da Escala de Produto
1. **Persistência completa do estado da Escala**
   - Salvar automaticamente no projeto: inputs do formulário, países, moeda, plataformas, prints enviados, contexto OCR extraído, diagnóstico completo, plano gerado, KPIs, criativos avançados, plano D1/D2/D3, alertas e histórico.
   - Manter também um rascunho local com debounce para recuperação se a conexão falhar.
   - Atualizar `updated_at` do projeto em toda geração/autosave para a lista “Projetos” refletir atividade real.

2. **Hidratação ao reabrir projeto**
   - Fazer o formulário da Escala carregar `lastPlanInput`, prints/contexto salvo e diagnóstico anterior quando entrar em `/projetos/:id?tab=escala`.
   - Garantir que `ScaleAnalyzer` sincronize estado quando `initialPlan`, `initialAnalysis` ou diagnóstico forem carregados do projeto.
   - Exibir “rascunho recuperado” quando houver cache local mais recente.

3. **Ações de projeto**
   - Adicionar na lista de Projetos: **Continuar projeto**, **Abrir estratégia**, **Editar**, **Duplicar**, **Excluir** com confirmação.
   - Criar server function para duplicar projeto preservando `meta.scale` e conteúdo estratégico.
   - Melhorar card do projeto com thumbnail, data, país, nicho, score, plataforma e status.
   - Status visual: em análise, pausado, escalando, vencedor, arquivado. Como o banco hoje só aceita texto, usarei o campo `status` existente sem migração estrutural, validando esses novos valores no código.

### Prioridade 2 — PDF baixável do diagnóstico/plano
4. **Exportar diagnóstico para PDF**
   - Adicionar utilitário client-side `src/lib/scale/pdf.ts` usando `html2canvas` + `jsPDF`.
   - Criar botão **Exportar PDF** no resultado da Escala.
   - Exportar apenas as seções estratégicas: scores, diagnóstico visual, diagnóstico da oferta, Meta/Google/Instagram, criativos, KPIs, plano D1/D2/D3 e alertas.
   - Tratar conteúdo longo em múltiplas páginas e mostrar toast de erro/sucesso.
   - Se as dependências não existirem, instalar `jspdf` e `html2canvas`.

### Prioridade 3 — Melhorar Minerar Ofertas
5. **Novas categorias inteligentes**
   - Expandir `src/lib/mining/keywords.ts` com: Lead, VSL, Webinar, Quiz, Low ticket, High ticket, PLR, Dropshipping, SaaS, Afiliado, Black, White, Nutra, Financeiro, Relacionamento, Desenvolvimento pessoal, IA, Educação, Infantil, Cristão, Ecommerce, Marketplace, Automação, Copy, Branding, Viral, UGC, TikTok Viral.
   - Ajustar filtros/chips para essas categorias aparecerem e filtrarem anúncios já coletados.

6. **Detecção de VSL e padrões fortes**
   - Enriquecer normalização do coletor para detectar: VSL escalando, hook repetido, estrutura viral, padrão de copy, promessa, mecanismo, CTA, ritmo/estilo aproximado e palavras/headlines repetidas.
   - Persistir esses sinais em `raw.enriched` dos anúncios coletados sem criar nova tabela.
   - Mostrar badges no card: **VSL escalando**, **Hook repetido**, **Estrutura viral detectada**, **Padrão de copy detectado**.

7. **Botão “Modelar Estratégia”**
   - Adicionar ação nos cards de Minerar Ofertas e Ofertas Escaladas.
   - Ao clicar, criar um projeto já preenchido a partir do anúncio/VSL: headline, promessa, avatar, mecanismo, ângulos, CTA, funil e origem.
   - Pré-popular `meta.scale.lastPlanInput` com os dados do anúncio e abrir direto em `/projetos/:id?tab=escala` para gerar/editar a estratégia.

### Prioridade 4 — UX e confiabilidade
8. **Estados de carregamento e feedback**
   - Skeletons nos projetos e na Escala enquanto carrega.
   - Toasts claros para autosave, PDF, duplicação, exclusão e modelagem.
   - Retry onde já existe IA/collector; manter mensagens amigáveis quando falhar.

## Arquivos principais afetados
- `src/lib/scale.functions.ts`
- `src/components/pipeline/ScaleAnalyzer.tsx`
- `src/components/pipeline/scale/CampaignPlanForm.tsx`
- `src/components/pipeline/scale/CampaignPlanResult.tsx`
- `src/lib/scale/pdf.ts`
- `src/lib/project.functions.ts`
- `src/routes/_authenticated/projetos.tsx`
- `src/routes/_authenticated/projetos.$id.tsx`
- `src/routes/_authenticated/minerar.tsx`
- `src/routes/_authenticated/ofertas-escaladas.tsx`
- `src/lib/mining/keywords.ts`
- `src/lib/collector/collector.normalizer.ts`
- `src/routes/api/collector.run.ts`

## Critérios de aceite
- Um plano/diagnóstico gerado em Escala reaparece corretamente ao abrir o projeto depois.
- Inputs e prints não somem ao trocar de rota ou recarregar.
- Projetos têm ações de continuar, abrir estratégia, editar, duplicar e excluir.
- Exportar PDF baixa um arquivo legível com scores, diagnósticos, D1/D2/D3 e alertas.
- Minerar Ofertas mostra as novas categorias e badges de VSL/padrões.
- “Modelar Estratégia” cria projeto e abre a Escala já contextualizada para continuar.