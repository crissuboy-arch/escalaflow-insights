-- Module Skills: each platform module has one active AI skill as its engine
create table if not exists public.module_skills (
  id          uuid primary key default gen_random_uuid(),
  module_key  text not null,
  skill_id    text not null default '',
  skill_name  text not null,
  skill_prompt text not null default '',
  input_schema jsonb not null default '[]',
  output_schema jsonb not null default '[]',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists module_skills_active_idx
  on public.module_skills(module_key)
  where is_active = true;

alter table public.module_skills enable row level security;
create policy "module_skills_read_all" on public.module_skills for select using (true);

-- ── Seed default skills ─────────────────────────────────────────────────────

insert into public.module_skills (module_key, skill_id, skill_name, skill_prompt, input_schema, output_schema, is_active)
select 'tiktok_radar', 'tiktok-viral-mining', 'TikTok Viral Mining Skill',
$p$Você é um especialista em TikTok e marketing digital de alta performance. Analise o nicho e palavras-chave fornecidos e gere uma estratégia viral completa. Responda SEMPRE em Markdown bem formatado com as seções: ## Hooks Virais (10 hooks irresistíveis no formato "número + promessa"), ## Formatos de Vídeo Escalando (5 formatos com estrutura detalhada), ## Hashtags Estratégicas (8 hashtags com volume estimado), ## Análise de Padrões Virais (tendências detectadas no nicho), ## CTA de Alta Conversão (3 variações testadas).$p$,
'[{"key":"nicho","label":"Nicho","type":"text","placeholder":"ex: emagrecimento, finanças, marketing"},{"key":"palavra_chave","label":"Palavra-chave Principal","type":"text","placeholder":"ex: perda de peso rápida"},{"key":"publico_alvo","label":"Público-Alvo","type":"text","placeholder":"ex: mulheres 25-40 anos"},{"key":"objetivo","label":"Objetivo","type":"select","options":["Vender produto","Gerar leads","Crescer seguidores","Viralizar conteúdo"]}]'::jsonb,
'[{"key":"hooks","label":"Hooks Virais"},{"key":"formatos","label":"Formatos"},{"key":"hashtags","label":"Hashtags"},{"key":"analise","label":"Análise"}]'::jsonb,
true
where not exists (select 1 from public.module_skills where module_key = 'tiktok_radar' and is_active = true);

insert into public.module_skills (module_key, skill_id, skill_name, skill_prompt, input_schema, output_schema, is_active)
select 'youtube_radar', 'youtube-strategic-analysis', 'YouTube Strategic Analysis Skill',
$p$Você é um especialista em YouTube e marketing de conteúdo. Crie uma análise estratégica completa. Responda em Markdown com as seções: ## Títulos de Alto CTR (10 títulos com percentual de CTR estimado), ## Estrutura de Roteiro Vencedor (gancho 0-3s, corpo, CTA), ## Descrição de Thumbnails (5 conceitos visuais com cores e emoção), ## Estratégia SEO (palavras-chave, tags, descrição), ## Plano de Monetização e Escala.$p$,
'[{"key":"nicho","label":"Nicho","type":"text","placeholder":"ex: marketing digital, saúde"},{"key":"tema","label":"Tema do Vídeo","type":"text","placeholder":"ex: como fazer R$10k por mês online"},{"key":"tipo_canal","label":"Tipo de Canal","type":"select","options":["Educacional","Entretenimento","Vendas","Autoridade"]},{"key":"duracao","label":"Duração Alvo","type":"select","options":["Shorts (< 60s)","Médio (5-15min)","Longo (15-60min)"]}]'::jsonb,
'[{"key":"titulos","label":"Títulos"},{"key":"roteiro","label":"Roteiro"},{"key":"thumbnails","label":"Thumbnails"},{"key":"seo","label":"SEO"}]'::jsonb,
true
where not exists (select 1 from public.module_skills where module_key = 'youtube_radar' and is_active = true);

insert into public.module_skills (module_key, skill_id, skill_name, skill_prompt, input_schema, output_schema, is_active)
select 'meta_ads_radar', 'meta-ads-intelligence', 'Meta Ads Intelligence Skill',
$p$Você é um especialista em Meta Ads (Facebook e Instagram) com expertise em campanhas de alto ROAS. Crie uma inteligência completa de anúncios. Responda em Markdown com: ## Copies de Anúncio (5 copies completas: headline + copy + CTA), ## Ângulos de Posicionamento (3 ângulos diferentes: dor, desejo, medo), ## Públicos-Alvo Detalhados (interesses, comportamentos, lookalikes), ## Estrutura de Campanha (topo/meio/fundo de funil com budget sugerido), ## Criativos Recomendados (3 conceitos de imagem/vídeo).$p$,
'[{"key":"produto","label":"Produto/Serviço","type":"text","placeholder":"ex: curso de emagrecimento"},{"key":"preco","label":"Preço","type":"text","placeholder":"ex: R$297"},{"key":"pais","label":"País-Alvo","type":"select","options":["Brasil","Portugal","Estados Unidos","Espanha","Angola"]},{"key":"objetivo","label":"Objetivo da Campanha","type":"select","options":["Conversão","Leads","Tráfego","Reconhecimento de Marca"]}]'::jsonb,
'[{"key":"copies","label":"Copies"},{"key":"angulos","label":"Ângulos"},{"key":"publicos","label":"Públicos"},{"key":"estrutura","label":"Estrutura"}]'::jsonb,
true
where not exists (select 1 from public.module_skills where module_key = 'meta_ads_radar' and is_active = true);

insert into public.module_skills (module_key, skill_id, skill_name, skill_prompt, input_schema, output_schema, is_active)
select 'criar_ebook', 'ebook-alta-conversao', 'Ebook Alta Conversão Skill',
$p$Você é um especialista em criação de infoprodutos e ebooks de alta conversão. Crie um plano editorial completo. Responda em Markdown com: ## Títulos (1 título principal + 3 variações com promessa clara), ## Sumário Completo (7-10 capítulos com subtítulos e resumo de 2 linhas por capítulo), ## Introdução (texto completo de 300-400 palavras que prende o leitor), ## Promessa Transformacional (declaração única de resultado), ## Estratégia de Preço e Posicionamento, ## Bônus Recomendados (3-5 bônus que aumentam o valor percebido).$p$,
'[{"key":"tema","label":"Tema do Ebook","type":"text","placeholder":"ex: como emagrecer 10kg em 30 dias"},{"key":"publico","label":"Público-Alvo","type":"text","placeholder":"ex: mulheres acima de 40 anos"},{"key":"transformacao","label":"Transformação Prometida","type":"text","placeholder":"ex: perder peso sem dieta restritiva"},{"key":"formato","label":"Formato","type":"select","options":["PDF Completo","Mini-Ebook (30-50 pág)","Guia Rápido (10-20 pág)","Manual Técnico"]},{"key":"idioma","label":"Idioma","type":"select","options":["Português","English","Español"]}]'::jsonb,
'[{"key":"titulo","label":"Títulos"},{"key":"sumario","label":"Sumário"},{"key":"introducao","label":"Introdução"},{"key":"bonus","label":"Bônus"}]'::jsonb,
true
where not exists (select 1 from public.module_skills where module_key = 'criar_ebook' and is_active = true);

insert into public.module_skills (module_key, skill_id, skill_name, skill_prompt, input_schema, output_schema, is_active)
select 'storybook_ia', 'playbook-animabook-converter', 'Playbook to AnimaBook Skill',
$p$Você é um especialista em storytelling visual e criação de playbooks animados premium. Transforme o tema em um playbook visual completo. Responda em Markdown com: ## Estrutura de Capítulos (5-8 capítulos com títulos impactantes e resumo executivo), ## Pontos-Chave por Capítulo (3 insights acionáveis por capítulo), ## Prompts de Imagem (um prompt detalhado por capítulo para Midjourney/DALL-E), ## Prompts de Animação (movimento, duração, transição para cada slide), ## Roteiro de Narração (texto completo para narração em voz de cada capítulo).$p$,
'[{"key":"titulo","label":"Título do Playbook","type":"text","placeholder":"ex: O Sistema de Escala Digital"},{"key":"tipo","label":"Tipo","type":"select","options":["Business Playbook","Marketing Playbook","Sales Playbook","Leadership Playbook","Personal Development"]},{"key":"publico","label":"Público","type":"text","placeholder":"ex: empreendedores digitais"},{"key":"mensagem_central","label":"Mensagem Central","type":"text","placeholder":"ex: como escalar de 0 a 100k em 90 dias"},{"key":"estilo_visual","label":"Estilo Visual","type":"select","options":["Dark Premium","Minimalista","Futurista","Corporativo","Vibrante"]}]'::jsonb,
'[{"key":"capitulos","label":"Capítulos"},{"key":"insights","label":"Insights"},{"key":"prompts_imagem","label":"Prompts de Imagem"},{"key":"narracao","label":"Narração"}]'::jsonb,
true
where not exists (select 1 from public.module_skills where module_key = 'storybook_ia' and is_active = true);

insert into public.module_skills (module_key, skill_id, skill_name, skill_prompt, input_schema, output_schema, is_active)
select 'workflow_builder', 'pipeline-orchestrator', 'Pipeline Orchestrator Skill',
$p$Você é um especialista em automação de marketing e orquestração de fluxos de trabalho com IA. Crie um pipeline operacional completo. Responda em Markdown com: ## Mapa do Pipeline (diagrama em texto ASCII com todas as etapas), ## Agentes Necessários (lista de agentes com função, input e output de cada um), ## Sequência de Tarefas (cada tarefa com gatilho, ação e condição de sucesso), ## Pontos de Decisão (condições e ramificações do fluxo), ## Métricas de Monitoramento (KPIs por etapa), ## Plano de Implementação em 30 Dias (semana a semana).$p$,
'[{"key":"objetivo","label":"Objetivo do Pipeline","type":"text","placeholder":"ex: pipeline de vendas totalmente automático"},{"key":"ferramentas","label":"Ferramentas Disponíveis","type":"text","placeholder":"ex: n8n, Supabase, Claude AI, webhooks"},{"key":"gatilho","label":"Gatilho de Entrada","type":"text","placeholder":"ex: novo lead capturado via formulário"},{"key":"resultado","label":"Resultado Esperado","type":"text","placeholder":"ex: cliente onboardado e primeira compra realizada"},{"key":"prazo","label":"Prazo de Implementação","type":"select","options":["7 dias","15 dias","30 dias","60 dias","90 dias"]}]'::jsonb,
'[{"key":"mapa","label":"Mapa"},{"key":"agentes","label":"Agentes"},{"key":"tarefas","label":"Tarefas"},{"key":"metricas","label":"Métricas"}]'::jsonb,
true
where not exists (select 1 from public.module_skills where module_key = 'workflow_builder' and is_active = true);

insert into public.module_skills (module_key, skill_id, skill_name, skill_prompt, input_schema, output_schema, is_active)
select 'exportacao', 'export-intelligence', 'Export Intelligence Skill',
$p$Você é um especialista em produção de relatórios e exportação de conteúdo digital estratégico. Crie um pacote de exportação completo. Responda em Markdown com: ## Relatório Executivo (resumo de 2 parágrafos com os resultados principais), ## Principais Métricas e Insights (tabela formatada com dados relevantes), ## Recomendações Priorizadas (top 5 ações com impacto e esforço estimados), ## Template de Apresentação (estrutura de 10-12 slides com título e conteúdo), ## Checklist de Entrega (lista verificável de todos os itens a entregar).$p$,
'[{"key":"tipo_relatorio","label":"Tipo de Relatório","type":"select","options":["Campanhas de Anúncios","Análise de Mercado","Plano Estratégico","Kit de Criativos","Playbook Completo"]},{"key":"destinatario","label":"Destinatário","type":"text","placeholder":"ex: cliente, equipe, investidores"},{"key":"periodo","label":"Período","type":"text","placeholder":"ex: Q1 2026, últimos 30 dias"},{"key":"dados_contexto","label":"Dados / Contexto","type":"textarea","placeholder":"Cole aqui os dados ou resultados a incluir no relatório"}]'::jsonb,
'[{"key":"relatorio","label":"Relatório"},{"key":"metricas","label":"Métricas"},{"key":"recomendacoes","label":"Recomendações"},{"key":"checklist","label":"Checklist"}]'::jsonb,
true
where not exists (select 1 from public.module_skills where module_key = 'exportacao' and is_active = true);
