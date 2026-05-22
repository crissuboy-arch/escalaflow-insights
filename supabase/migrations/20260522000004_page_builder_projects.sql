create table if not exists public.page_builder_projects (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  html             text not null default '',
  skill_id         text not null default '',
  design_system_id text not null default '',
  form_data        jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists page_builder_user_id_idx on public.page_builder_projects(user_id);
alter table public.page_builder_projects enable row level security;
drop policy if exists "users own page_builder_projects" on public.page_builder_projects;
create policy "users own page_builder_projects"
  on public.page_builder_projects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
