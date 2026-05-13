create table if not exists public.ai_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid references public.projects(id) on delete cascade,
  module text not null,
  prompt jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  model text,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists ai_history_project_idx on public.ai_history(project_id, module, created_at desc);
create index if not exists ai_history_user_idx on public.ai_history(user_id, created_at desc);

alter table public.ai_history enable row level security;

create policy "ai_history select own" on public.ai_history for select to authenticated using (auth.uid() = user_id);
create policy "ai_history insert own" on public.ai_history for insert to authenticated with check (auth.uid() = user_id);
create policy "ai_history delete own" on public.ai_history for delete to authenticated using (auth.uid() = user_id);
create policy "ai_history admins read all" on public.ai_history for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "projects admins read all" on public.projects for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "projects admins update all" on public.projects for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "projects admins delete all" on public.projects for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "ebooks admins read all" on public.ebooks for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "ebooks admins update all" on public.ebooks for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "ebooks admins delete all" on public.ebooks for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "playbooks admins read all" on public.playbooks for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "playbooks admins update all" on public.playbooks for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "playbooks admins delete all" on public.playbooks for delete to authenticated using (public.has_role(auth.uid(), 'admin'));