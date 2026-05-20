-- EscalaFlow - Schema Completo do Banco de Dados
-- Gerado automaticamente - não editar manualmente
-- Última atualização: 2026-05-20

-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.offer_status AS ENUM ('teste', 'validando', 'escalando', 'quente');
CREATE TYPE public.ad_action AS ENUM ('saved', 'favorite', 'scaled');

-- ============================================================================
-- TABELAS DE USUÁRIO E PERFIL
-- ============================================================================

-- Perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'pt',
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Papéis de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- ============================================================================
-- TABELAS DE MINERAÇÃO E OFERTAS
-- ============================================================================

-- Ofertas mineradas (catálogo compartilhado)
CREATE TABLE public.mined_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_name TEXT NOT NULL,
  image_url TEXT,
  summary TEXT,
  scale_score INTEGER NOT NULL DEFAULT 0,
  platform TEXT NOT NULL,
  country TEXT NOT NULL,
  niche TEXT NOT NULL,
  keyword TEXT,
  ads_count INTEGER NOT NULL DEFAULT 1,
  status public.offer_status NOT NULL DEFAULT 'teste',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ofertas salvas pelo usuário
CREATE TABLE public.saved_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.mined_offers(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, offer_id)
);

-- Análises de IA
CREATE TABLE public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.mined_offers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  promise TEXT,
  mechanism TEXT,
  pains JSONB DEFAULT '[]'::jsonb,
  desires JSONB DEFAULT '[]'::jsonb,
  target_audience TEXT,
  mental_triggers JSONB DEFAULT '[]'::jsonb,
  offer_structure TEXT,
  creative_suggestions JSONB DEFAULT '[]'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ads coletados pelo collector
CREATE TABLE public.collected_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_library_id TEXT UNIQUE,
  ad_url TEXT,
  advertiser TEXT NOT NULL DEFAULT 'Anunciante',
  headline TEXT NOT NULL DEFAULT '',
  copy TEXT,
  cta TEXT,
  image_url TEXT,
  video_url TEXT,
  creative_type TEXT,
  platform TEXT NOT NULL DEFAULT 'Facebook',
  country TEXT NOT NULL DEFAULT '—',
  niche TEXT NOT NULL DEFAULT 'Geral',
  keyword TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  favorite BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'collector',
  raw JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ações do usuário em ads (saved, favorite, scaled)
CREATE TABLE public.user_ad_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ad_id UUID NOT NULL REFERENCES public.collected_ads(id) ON DELETE CASCADE,
  action public.ad_action NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ad_id, action)
);

-- ============================================================================
-- TABELAS DE MINERAÇÃO REAL (Apify)
-- ============================================================================

-- Ofertas da mineração real
CREATE TABLE public.offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL,
  advertiser TEXT,
  headline TEXT,
  copy TEXT,
  cta TEXT,
  creative_type TEXT,
  platform TEXT,
  country TEXT,
  engagement JSONB,
  landing_page TEXT,
  language TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  score INTEGER NOT NULL DEFAULT 0,
  niche TEXT,
  keyword TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Análises genéricas
CREATE TABLE public.analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.mined_offers(id) ON DELETE SET NULL,
  mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL,
  type TEXT,
  title TEXT,
  content JSONB,
  status TEXT NOT NULL DEFAULT 'done',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tendências
CREATE TABLE public.trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL,
  topic TEXT,
  country TEXT,
  language TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Execuções de mineração
CREATE TABLE public.mining_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  query TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  language TEXT NOT NULL DEFAULT 'pt',
  status TEXT NOT NULL DEFAULT 'running',
  results_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Ads salvos (persistência direta)
CREATE TABLE public.saved_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES public.collected_ads(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.mined_offers(id) ON DELETE SET NULL,
  mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  UNIQUE(user_id, ad_id),
  UNIQUE(user_id, offer_id)
);

-- Favoritos
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES public.collected_ads(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.mined_offers(id) ON DELETE SET NULL,
  mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL,
  favorited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(user_id, ad_id),
  UNIQUE(user_id, offer_id)
);

-- Logs da extensão
CREATE TABLE public.extension_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'extension',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABELAS DE PRODUTOS
-- ============================================================================

-- Projetos
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Novo Projeto',
  niche text,
  source_ad_key text,
  briefing jsonb NOT NULL DEFAULT '{}'::jsonb,
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  mode text NOT NULL DEFAULT 'combo',
  ebook_id uuid,
  playbook_id uuid,
  cover_url text,
  status text NOT NULL DEFAULT 'draft',
  step integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  country text,
  language text NOT NULL DEFAULT 'pt',
  product_type text,
  last_opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ebooks
CREATE TABLE public.ebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_ad_key text,
  title text NOT NULL DEFAULT 'Novo Ebook',
  subtitle text,
  niche text,
  briefing jsonb NOT NULL DEFAULT '{}'::jsonb,
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  chapters jsonb NOT NULL DEFAULT '[]'::jsonb,
  layout text NOT NULL DEFAULT 'classico',
  cover_url text,
  status text NOT NULL DEFAULT 'draft',
  step int NOT NULL DEFAULT 0,
  chapter_count int NOT NULL DEFAULT 6,
  mode text NOT NULL DEFAULT 'kdp',
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Playbooks
CREATE TABLE public.playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Novo Playbook',
  niche text,
  source_ad_key text,
  avatar text,
  promise text,
  unique_mechanism text,
  briefing jsonb NOT NULL DEFAULT '{}'::jsonb,
  scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme text NOT NULL DEFAULT 'neon-roxo',
  cover_url text,
  status text NOT NULL DEFAULT 'draft',
  step integer NOT NULL DEFAULT 0,
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Outputs de projeto
CREATE TABLE public.project_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  agent text NOT NULL,
  kind text NOT NULL DEFAULT 'analysis',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'done',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tarefas de projeto
CREATE TABLE public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  due_at timestamptz,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Timeline de projeto
CREATE TABLE public.project_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  ref_id uuid,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Campanhas de projeto
CREATE TABLE public.project_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  name text NOT NULL DEFAULT 'Campanha',
  audiences jsonb NOT NULL DEFAULT '[]'::jsonb,
  angles jsonb NOT NULL DEFAULT '[]'::jsonb,
  headlines jsonb NOT NULL DEFAULT '[]'::jsonb,
  ad_copies jsonb NOT NULL DEFAULT '[]'::jsonb,
  creatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Assets de projeto
CREATE TABLE public.project_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Scores de projeto
CREATE TABLE public.project_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  dimension text NOT NULL,
  value int NOT NULL DEFAULT 0,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  fixes jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Histórico de IA
CREATE TABLE public.ai_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  module text NOT NULL,
  model text,
  prompt jsonb NOT NULL,
  response jsonb NOT NULL,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- ÍNDICES PRINCIPAIS
-- ============================================================================

CREATE INDEX IF NOT EXISTS collected_ads_created_at_idx ON public.collected_ads (created_at DESC);
CREATE INDEX IF NOT EXISTS collected_ads_keyword_idx ON public.collected_ads (keyword);
CREATE INDEX IF NOT EXISTS collected_ads_user_idx ON public.collected_ads (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS collected_ads_mining_idx ON public.collected_ads (mining_run_id);

CREATE INDEX IF NOT EXISTS idx_user_ad_actions_user_action ON public.user_ad_actions (user_id, action);
CREATE INDEX IF NOT EXISTS idx_user_ad_actions_ad ON public.user_ad_actions (ad_id);

CREATE INDEX IF NOT EXISTS idx_offers_user ON public.offers (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_mining ON public.offers (mining_run_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers (status);
CREATE INDEX IF NOT EXISTS idx_offers_score ON public.offers (score DESC);
CREATE INDEX IF NOT EXISTS idx_offers_platform ON public.offers (platform);
CREATE INDEX IF NOT EXISTS idx_offers_country ON public.offers (country);

CREATE INDEX IF NOT EXISTS idx_analyses_user ON public.analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_project ON public.analyses (project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_offer ON public.analyses (offer_id);

CREATE INDEX IF NOT EXISTS idx_trends_user ON public.trends (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_topic ON public.trends (topic);
CREATE INDEX IF NOT EXISTS idx_trends_country ON public.trends (country);

CREATE INDEX IF NOT EXISTS idx_mining_runs_user ON public.mining_runs (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mining_runs_type ON public.mining_runs (type, status);

CREATE INDEX IF NOT EXISTS idx_saved_ads_user ON public.saved_ads (user_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_ads_mining ON public.saved_ads (mining_run_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites (user_id, favorited_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_mining ON public.favorites (mining_run_id);

CREATE INDEX IF NOT EXISTS idx_extension_logs_user ON public.extension_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extension_logs_type ON public.extension_logs (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ebooks_project ON public.ebooks (project_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_project ON public.playbooks (project_id);
CREATE INDEX IF NOT EXISTS idx_ebooks_user ON public.ebooks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_outputs_project ON public.project_outputs (project_id, agent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks (project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_project_timeline_project ON public.project_timeline (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_campaigns_project ON public.project_campaigns (project_id, platform);
CREATE INDEX IF NOT EXISTS idx_project_assets_project ON public.project_assets (project_id, kind);
CREATE INDEX IF NOT EXISTS idx_project_scores_project ON public.project_scores (project_id, dimension, created_at DESC);
