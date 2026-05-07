## Diagnosis

The DB sample confirms the problem is in **normalization, not Apify**: rows show `headline = advertiser`, empty `copy`, null `image_url`/`video_url`. The `curious_coder/facebook-ads-library-scraper` actor returns ad data in a **nested `snapshot` object** (with `cards[]`, `images[]`, `videos[]`, `body.text`, `title`, `link_description`, `cta_text`, `page_name`, `original_image_url`, `resized_image_url`, `video_preview_image_url`, `video_hd_url`, etc.), and our current `pick()` only looks at top-level keys. So 99% of useful fields are silently dropped.

We're also not persisting the raw payload, which makes debugging blind.

## Plan

### 1. Persist raw payload for forensics
- In `collector.run.ts`, include `raw: a.raw` when inserting into `collected_ads` (column already exists, currently null).
- Add `raw?: unknown` to `CollectorAd` type, populated by the normalizer with the original Apify item.

### 2. Rewrite the normalizer to walk the actor's real shape
File: `src/lib/collector/collector.normalizer.ts`

- Add `deepPick(obj, paths[])` helper that supports dotted paths (`snapshot.body.text`, `snapshot.cards.0.body`) and returns the first non-empty string.
- Add `deepFindString(obj, regex)` fallback that recursively scans for the first URL matching `\.(jpg|png|webp)` or `\.mp4` if structured paths miss.
- Map fields with this priority order (real keys from this actor):

  | Field | Source priority |
  |---|---|
  | `advertiser` | `snapshot.page_name` → `page_name` → `advertiser_name` → `pageName` |
  | `headline` | `snapshot.title` → `snapshot.cards[0].title` → `ad_creative_link_title` → `title` |
  | `copy` | `snapshot.body.text` → `snapshot.body.markup.__html` → `snapshot.cards[0].body` → `ad_creative_body` → `body` |
  | `cta` | `snapshot.cta_text` → `snapshot.cards[0].cta_text` → `cta_type` |
  | `imageUrl` | `snapshot.images[0].original_image_url` → `snapshot.images[0].resized_image_url` → `snapshot.cards[0].original_image_url` → `snapshot.cards[0].resized_image_url` → `snapshot.videos[0].video_preview_image_url` → top-level `image_url` → deep-find image regex |
  | `videoUrl` | `snapshot.videos[0].video_hd_url` → `snapshot.videos[0].video_sd_url` → `snapshot.cards[0].video_hd_url` → top-level `video_url` |
  | `videoThumbnail` | `snapshot.videos[0].video_preview_image_url` → `snapshot.cards[0].video_preview_image_url` |
  | `adLibraryId` | `ad_archive_id` → `adArchiveId` → `snapshot.ad_archive_id` |
  | `adUrl` | derived from `adLibraryId` (Facebook Ads Library URL) → `url` |
  | `platform` | `publisher_platform[]` joined (Facebook/Instagram/Messenger/Audience Network) — keep first as primary |
  | `country` | `snapshot.country` → top-level `country` → input fallback |
  | `startDate` | `start_date` (epoch) → ISO string |

- If `videoUrl` is present and `imageUrl` is missing, **use `videoThumbnail` as `imageUrl`** so the card always has visual media when available. No fake/placeholder generation — if both are absent, leave empty.

### 3. Increase fields requested from the actor
File: `src/lib/collector/collector.apify.ts`
- Pass `scrapeAdDetails: true` (and `scrapePageAds.activeStatus: "active"` already present) so the actor returns `snapshot` (full creative payload) instead of summary-only.
- Add a `console.log("[apify] sample item keys:", Object.keys(first), JSON.stringify(first).slice(0, 1500))` of the first item (server-side only) for one-shot debugging.

### 4. Update types
File: `src/lib/collector/collector.types.ts`
- Add to `CollectorAd`: `videoThumbnail?: string`, `startDate?: string`, `platforms?: string[]`, `raw?: unknown`, `mediaSource?: "image"|"video-thumb"|"card-image"|"none"` (which path resolved the media — used for the UI badge).

### 5. Persist new fields
File: `src/routes/api/collector.run.ts`
- Include `raw: a.raw` in the row payload (column exists).
- No DB schema change needed (existing columns cover everything except `start_date`, which we'll add via migration only if user wants it persisted — initially keep it client-side from the response).

### 6. Frontend: media-source debug badge + fuller debug
File: `src/routes/_authenticated/minerar.tsx`
- Each card: small badge showing `mediaSource` (e.g. "imagem", "thumb do vídeo", "sem mídia"). No invented content.
- Expand the existing "Debug temporário" panel: show counts of items with image / video / neither, and the field paths that resolved for the first item.
- Keep "sem mídia capturada" / "sem copy capturada" placeholders but only when truly empty after the new normalization pass.

### 7. Validation
- Trigger a new mining run for "diabetes" via the UI after deploy.
- Expect: most cards now have `imageUrl` or `videoThumbnail`, real `copy` text, real `headline ≠ advertiser`, and `mediaSource` badge populated.
- Inspect `collected_ads.raw` in DB to confirm payload shape for any remaining empties — adjust priority list if a new key surfaces.

### What this plan does NOT do
- No mocks, no fake images, no synthetic copy.
- No changes to extension or ChatGPT integration.
- No DB schema migration (uses existing columns).
- No change to the Apify token or the actor identity.
