# Elias v1 — MVP breakdown

Working checklist derived from the PRD (CLAUDE.md). Each MVP is built and
reviewed on its own before the next one starts. Signup, login and onboarding
already exist and are out of scope here.

Sequencing follows PRD Ch. 6 / Ch. 12: Phase 0 builds every page as a
click-through prototype against mock data; live data and the pipeline come
only after design-lead and supervisor sign-off.

## MVP 0 — Design system and app shell

- [x] Tokens for verdicts and Arsip statuses (icon + colour, never colour alone — AR-2)
- [x] Type scale additions for the app pages (`text-2xl`, `text-display-sm`)
- [x] App header with the real navigation: Beranda, Arsip, Chat, Profil (V1: wordmark only, no avatar)
- [x] App shell with entrance animation and the shared footer

## MVP 1 — Beranda (Home) · Phase 0 · BR-1 to BR-5

- [x] Route `/` open to guests and signed-in users; `/dashboard` placeholder removed
- [x] Bounded feed per generation cycle, no live stream (BR-1)
- [x] Beranda shows the last 5 days of stored cycles, newest day first with day headings, 10 cards per numbered page (`/?halaman=N`, same Pagination as Arsip) — paging never refetches
- [x] Insight card, minimum anatomy: signal, source, role-flavoured recommendation (BR-2)
- [x] Verdict on every card, including "Lewati" — recommending against action (Ch. 1, Ch. 4)
- [x] Archetype line changes only the recommended action, never Elias's register (V4)
- [x] Save to Arsip with source, tags, date pre-filled; no reload needed (BR-3)
- [x] Guest render: Tier-1 sources only, generic, no role/archetype, visible profile prompt (BR-4)
- [x] Quiet-day state — no significant signal, nothing sent (V6); prototype switch `/?siklus=sepi`
- [x] No TikTok/Instagram coverage implied anywhere (BR-5)
- [ ] Full card field list — blocked on Open Question 2.7

## MVP 2 — Arsip (Archive) · Phase 0 · AR-1 to AR-8

- [x] Route `/arsip`, open to guests; reads the same store Beranda writes to
- [x] Archive scoped per owner (guest / each account) on the device; no guest→account migration (2.6 open)
- [x] Only queryable sources; TikTok/Instagram shown disabled as "belum tersedia" (AR-1)
- [x] Three statuses, inline editing, shape/icon + colour badges (AR-2)
- [x] Priority as a separate control, account-gated; guests get a signup prompt (AR-3, AR-4)
- [x] Filters (status, category, source, saved-date range, priority) with AND logic; four sort orders (AR-5)
- [x] Search over title, tags, notes; inline notes; remove with confirm
- [x] Numbered pagination with "Menampilkan X–Y dari Z tren" (AR-6) — 6 per page until 2.14 is answered
- [x] Empty / no-results states in the Ch. 4 tone (AR-7)
- [x] Guest state persists per device (AR-8); prototype sample data via `/arsip?contoh=1`
- [ ] Move account holders' archive to the database (with MVP 4)

## MVP 3 — Profile · Phase 0 · PR-1 to PR-6

- [ ] One flow over two objects: brand layer and personal layer (PR-1)
- [ ] Goals multi-select with exactly one primary (PR-2)
- [ ] Location required only once "Local" is checked, validated live (PR-3)
- [ ] 12 archetypes with inline descriptions (PR-4) — final copy blocked on 2.12
- [ ] Always On defaults to "hanya saat ada hal signifikan" (PR-5)
- [ ] No competitor field, no tone/language selector (PR-6)

## MVP 4 — Data model · Phase 1 · DM-1 to DM-8

- [ ] `user → workspace → brand_profile` in schema; workspace created silently at signup
- [ ] One brand profile per workspace, capped in app logic only (DM-2)
- [ ] Split today's `profiles` table into personal layer + brand layer
- [ ] All memory keyed to `brand_profile_id` (DM-4); `workspace_invite` reserved (DM-7)
- [ ] Saved trends move from device storage to the database for account holders
- [ ] Structural test: two brands, zero cross-brand hits at the query layer (DM-6)

## MVP 5 — Ingestion and synthesis · Phase 1

- [ ] Source adapters: YouTube Data API, GDELT, Google Trends behind a swappable adapter (DS-1)
  - [x] YouTube: all 12 charts Indonesia serves (general + 11 categories), 50 places each, with likes, comments, duration, upload date and tags (12 units/cycle, cached)
  - [x] YouTube searches per brand category (`src/lib/insights/youtubeSearch.ts`): 11 curated Indonesian queries, last 48h by views, non-Indonesian results dropped; 1,111 units/day, once per WIB day (reused from the snapshot on retries). Sports, Arts, Parenting off until better queries are found
  - [x] Topic groups counted in code (`src/lib/insights/topics.ts`) across every collected video: terms and title phrases shared by 3+ videos from 2+ channels, sent as a `<topics>` block citing member videos
  - The prompt gets the top 8 of each chart, top 4 of each search, each topic's members, then movers: max 150 videos
  - [x] GDELT: one `sourcecountry:indonesia` headline batch per cycle, through the same spacing/backoff (not yet seen returning articles: rate-limited or unreachable from the dev IP)
  - [x] Google Trends (`src/lib/googleTrends.ts`): the public "Trending now" RSS for Indonesia (10 newest searches, ~2 hours, traffic level + 3 news links each); `google-trends-api` is unusable (its daily endpoint answers 404)
    - Captured at most once an hour on any Beranda visit and by the cycle, merged into `google_trends_snapshots` per term per WIB day (`src/lib/insights/searchTrends.ts`); kept 30 days by pg_cron `purge-old-google-trends`
    - The prompt gets up to 20 searches seen in the last 24h as `<search_trends>` (`G1`…), with traffic level, start time, "N hari berturut-turut" streak and news titles; evidence links to the term's Trends explore page
    - [ ] Capture hourly from a cron instead of visits (with the warm-up cron), so quiet hours aren't missed
- [x] Generation cycle (`src/lib/insights/live.ts`): first request of the WIB day builds it, fixed until the next day; Beranda no longer reads `mock.ts`
  - Two stages on OpenRouter: one call picks up to 6 trends citing input ids, then 7 parallel per-role calls write recommendations (8 requests/day)
  - Cards carry only measured movement (views gained, rank change, new on chart vs. the previous stored day), never percentages or life-cycle claims. Each card links its evidence (videos/articles)
  - Failure shows "Feed hari ini belum tersedia" (never sample cards) and retries after 10 minutes
  - [x] Store each cycle in `insight_cycles` / `insights` (written with `SUPABASE_SECRET_KEY`; without it today's cycle stays in memory only)
  - [x] Keep 5 days: read policy hides older cycles, pg_cron job `purge-old-insights` deletes them at 00:05 WIB
  - [ ] Warm the cycle from the cron instead of the first visit (~2.5 min wait)
  - [x] Daily snapshots (`youtube_chart_snapshots`, `src/lib/insights/snapshots.ts`): every chart place saved once per WIB day, compared with the newest earlier day (up to 7 days back); kept 30 days by pg_cron `purge-old-youtube-snapshots`
  - [ ] Not yet seen live: a cycle comparing against a stored day (migration applied 2026-11-04; needs two days of cycles)
- [x] Explicit no-signal branch feeding the quiet-day state (V6): an empty trend list from the model is a quiet day

## MVP 5a — Live role-tailored analysis (OpenRouter free tier)

- [x] `POST /api/elias/insight` with `{ brandContext, trendTopic, userRole }`; signed-in only, brand id must be the caller's
- [x] Persona prompt (Ch. 4 voice, LN-1 glossary, restraint, no TikTok/Instagram claims); V3 enforced on the output
- [x] One request per call; model fallback via OpenRouter `models` routing, overridable with `OPENROUTER_MODELS`
- [x] Structured 429s: free daily cap vs. per-minute burst vs. per-user cap (`ELIAS_USER_DAILY_LIMIT`, default 10)
- [x] Server cache until midnight WIB + in-flight dedupe; client cache per tab session
- [x] Analysis panel on Beranda cards: Simpan ke Arsip (brief goes into the note), Salin Execution Brief
- [x] GDELT news context (`src/lib/gdelt.ts`): 3 headlines from the last 24h, fed into the prompt as data
- [x] GDELT safeguards: own 5.5s spacing, 5-minute backoff after a 429, 1h cache, never fails the insight
- [x] Card shows `// CONTEXT: GDELT VERIFIED` with the headlines as links, or a plain note when news is unavailable
- [ ] Not yet seen live: a GDELT answer with articles (the dev IP was rate-limited throughout testing)
- [x] YouTube trending chart (`src/lib/youtube.ts`, Indonesia top 3, 1 unit/call, 1h shared cache), fetched in parallel with GDELT
- [x] Card: `ARCHETYPE // ROLE` and `// SOURCE` badges, So what, Make It Today brief, context accordion with thumbnails
- [x] Response also carries `result`, `recommendation_status` (EXECUTE_TODAY / WATCH / SKIP), `action_format`, `youtubeData`
- [x] Full chain verified live once (YouTube + OpenRouter; GDELT degraded to its note)
- [ ] Server cache and per-user cap live in process memory; move to DB/KV before running on more than one instance

Env: `OPENROUTER_API_KEY` (required), `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, optional `OPENROUTER_MODELS`, `OPENROUTER_CYCLE_MODELS` (daily cycle), `ELIAS_USER_DAILY_LIMIT`.

## MVP 6 — Email digest · Phase 1 · ED-1 to ED-5

Env: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `APP_BASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, optional `EMAIL_TEST_RECIPIENT`, `ELIAS_DEV_TOOLS`.

- [x] Web push groundwork: `web-push` + types installed; VAPID pair (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) checked as matching
- [ ] Web push is a second channel next to email: confirm against ED-1 ("single email channel adapter") before building it out
- [ ] Verify a sending domain in Resend: the sender is on `resend.dev`, which only delivers to the Resend account owner's own address

- [x] QStash receiver `POST /api/cron/daily-briefing`: signature verified on the raw body and `APP_BASE_URL` (current + next key), acknowledges with "nothing sent" until the pipeline exists
- [x] On-demand test: `POST /api/test/trigger-briefing` + `/dev/briefing` page runs GDELT + YouTube → OpenRouter → Resend now; dev only (or `ELIAS_DEV_TOOLS=1`), signed-in, own address or `EMAIL_TEST_RECIPIENT` only, counts against the per-user cap
- [x] Briefing email template (`src/lib/elias/briefingEmail.ts`): dark memo, claim first, one action, sources last; all model/source text escaped
- [ ] On-demand test run end to end with a real session (needs a signed-in click on `/dev/briefing`)
- [ ] QStash schedule created (needs a public `APP_BASE_URL`; QStash cannot reach localhost)
- [ ] Single email channel adapter (ED-1)
- [ ] Cadence follows Always On; zero-send path tested (ED-2, ED-4)
- [ ] Briefing-memo template that opens with a claim (ED-3, V2)
- [ ] Every send resolves one `brand_profile_id` + one recipient (ED-5)

## MVP 7 — Chat with Elias · Phase 2

- [ ] Surface exists, follow-up on a card; full spec still open

## Cross-cutting

- [ ] Do-not-translate glossary lookup (LN-1) — list blocked on 2.13
- [ ] Copy lint: no emoji, no exclamation marks, claim-first openings (V2, V3)
