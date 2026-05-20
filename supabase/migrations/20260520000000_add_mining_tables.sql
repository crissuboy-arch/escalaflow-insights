-- src/supabase/migrations/20260520000000_add_mining_tables.sql

CREATE TABLE IF NOT EXISTS public.offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    advertiser TEXT,
    headline TEXT,
    copy TEXT,
    cta TEXT,
    creative_type TEXT,
    platform TEXT,
    country TEXT,
    engagement JSONB,
    landing_page TEXT,
    language TEXT
);

CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    type TEXT,
    content JSONB
);

CREATE TABLE IF NOT EXISTS public.trends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    topic TEXT,
    country TEXT,
    language TEXT,
    data JSONB
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
