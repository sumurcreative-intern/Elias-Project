-- "news": cards resting mainly on Indonesian outlets and industry media read
-- from their RSS feeds (src/lib/newsFeeds.ts). Until this is applied, the
-- store saves those cards as "gdelt" (src/lib/insights/store.ts).

alter table public.insights drop constraint insights_source_check;
alter table public.insights add constraint insights_source_check
  check (source in ('google_trends', 'youtube', 'gdelt', 'news', 'reddit', 'x'));
