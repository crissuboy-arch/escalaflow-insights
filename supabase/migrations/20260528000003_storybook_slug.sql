-- Slug público para publicação de AnimaBooks
alter table public.projects add column if not exists slug text;
create unique index if not exists projects_slug_idx on public.projects(slug) where slug is not null;

-- Galeria de imagens de inspiração por projeto
create table if not exists public.storybook_images (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  url         text not null,
  tag         text not null default 'inspiração visual',
  chapter_id  text,
  label       text,
  created_at  timestamptz not null default now()
);
create index if not exists storybook_images_project_idx on public.storybook_images(project_id);
alter table public.storybook_images enable row level security;
create policy "storybook_images_owner" on public.storybook_images
  for all using (
    project_id in (select id from public.projects where user_id = auth.uid())
  );
