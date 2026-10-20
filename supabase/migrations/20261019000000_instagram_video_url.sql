-- The Instagram radar never captured a real video URL for Reels/video
-- posts — only display_url (a static thumbnail/image). Apify's
-- apify~instagram-scraper response DOES include a playable videoUrl for
-- video items (already stored wholesale in the existing `raw` column, but
-- never promoted to its own column, so the UI had nothing to play).
-- Additive only — no existing column/row is touched.
alter table public.instagram_minerados
  add column if not exists video_url text,
  add column if not exists is_video boolean not null default false;
