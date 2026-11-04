import { NextResponse } from 'next/server';
import { isCreativeRole } from '@/lib/creativeRoles';
import { dedupe, getCachedInsight, refundUserBudget, setCachedInsight, takeUserBudget } from '@/lib/elias/cache';
import { executionBrief } from '@/lib/elias/brief';
import { generateInsight, type GenerateResult } from '@/lib/elias/openrouter';
import { fetchGdeltNewsContext, type NewsContext } from '@/lib/gdelt';
import { fetchYouTubeTrends, type YouTubeTrends } from '@/lib/youtube';
import {
  executionFormatLabels,
  insightCacheKey,
  recommendationStatus,
  type BrandContext,
  type EliasInsight,
  type InsightError,
  type InsightRequest,
  type InsightResponse,
} from '@/lib/elias/types';
import { createClient } from '@/lib/supabase/server';

const MAX_TOPIC_LENGTH = 500;
const MAX_KEYWORD_LENGTH = 60;

/** The explicit keyword, else the first quoted term in the trend ('matcha'), else none. */
function newsKeywordFor(request: InsightRequest): string | null {
  if (request.newsKeyword) return request.newsKeyword;
  return request.trendTopic.match(/['"‘“]([^'"’”]{3,60})['"’”]/)?.[1] ?? null;
}

const skippedNews: NewsContext = { status: 'skipped', query: null, articles: [], summary: 'Tidak ada kata kunci berita untuk tren ini.' };

type Grounded = { insight: EliasInsight; model: string; news: NewsContext; youtube: YouTubeTrends };

function success(request: InsightRequest, { insight, model, news, youtube }: Grounded, cached: boolean) {
  return NextResponse.json<InsightResponse>({
    ok: true,
    insight,
    model,
    cached,
    news,
    youtube,
    gdeltSource: news.status === 'ok' ? news.summary : null,
    youtubeData: youtube.videos,
    recommendation_status: recommendationStatus[insight.decision],
    action_format: executionFormatLabels[insight.action.format],
    result: executionBrief({ trendTopic: request.trendTopic, role: request.userRole, insight, news, youtube }),
  });
}

function fail(status: number, error: InsightError) {
  const headers = error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : undefined;
  return NextResponse.json<InsightResponse>({ ok: false, error }, { status, headers });
}

const optionalString = (value: unknown): value is string | null => value === null || typeof value === 'string';

function parseBrandContext(value: unknown): BrandContext | null {
  if (typeof value !== 'object' || value === null) return null;
  const brand = value as Record<string, unknown>;
  if (typeof brand.id !== 'string' || !brand.id) return null;
  if (![brand.category, brand.archetype, brand.targetMarket, brand.location].every(optionalString)) return null;
  if (typeof brand.localFocus !== 'boolean') return null;
  if (!Array.isArray(brand.goals) || !brand.goals.every((goal) => typeof goal === 'string')) return null;
  return {
    id: brand.id,
    category: brand.category as string | null,
    archetype: brand.archetype as string | null,
    targetMarket: brand.targetMarket as string | null,
    location: (brand.location as string | null)?.slice(0, 120) ?? null,
    localFocus: brand.localFocus,
    goals: (brand.goals as string[]).slice(0, 6).map((goal) => goal.slice(0, 120)),
  };
}

function parseRequest(body: unknown): InsightRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { brandContext, trendTopic, userRole, newsKeyword } = body as Record<string, unknown>;
  const brand = parseBrandContext(brandContext);
  if (!brand || typeof trendTopic !== 'string' || !isCreativeRole(userRole)) return null;
  if (newsKeyword !== undefined && typeof newsKeyword !== 'string') return null;
  const topic = trendTopic.trim().slice(0, MAX_TOPIC_LENGTH);
  const keyword = newsKeyword?.trim().slice(0, MAX_KEYWORD_LENGTH);
  return topic ? { brandContext: brand, trendTopic: topic, userRole, ...(keyword && { newsKeyword: keyword }) } : null;
}

/**
 * POST { brandContext, trendTopic, userRole, newsKeyword? } → role-tailored
 * call on one trend, grounded on the last 24 hours of GDELT news and today's
 * YouTube Indonesia trending chart.
 * Signed-in only: the free tier allows 50 requests a day for the whole app.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, { code: 'unauthorized', message: 'Masuk dulu untuk meminta analisis Elias.' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const insightRequest = parseRequest(body);
  if (!insightRequest) {
    return fail(400, { code: 'invalid_request', message: 'Permintaan tidak lengkap: brandContext, trendTopic, dan userRole wajib diisi.' });
  }

  // The brand id doubles as the cache key, so it must be the caller's own;
  // otherwise one account could read another's cached answers (DM-6)
  if (insightRequest.brandContext.id !== user.id) {
    return fail(403, { code: 'forbidden', message: 'Brand ini bukan milik akun kamu.' });
  }

  const key = insightCacheKey(insightRequest);
  const cached = await getCachedInsight(key);
  if (cached) return success(insightRequest, cached, true);

  type Outcome = { generated: GenerateResult; news: NewsContext; youtube: YouTubeTrends };
  const result = await dedupe<Outcome | { overBudget: number }>(key, async () => {
    const budget = await takeUserBudget(user.id);
    if (!budget.allowed) return { overBudget: budget.retryAfter };
    // Neither source can fail the call: problems come back as a status the
    // prompt and the card both handle
    const keyword = newsKeywordFor(insightRequest);
    const [news, youtube] = await Promise.all([
      keyword ? fetchGdeltNewsContext(keyword) : Promise.resolve(skippedNews),
      fetchYouTubeTrends('ID', 3),
    ]);
    const generated = await generateInsight(insightRequest, news, youtube);
    if (generated.ok) await setCachedInsight(key, generated.insight, generated.model, news, youtube);
    // Rejected before reaching a model: don't count it against the user
    else if (generated.status === 429 || generated.status === 503) await refundUserBudget(user.id, budget);
    return { generated, news, youtube };
  });

  if ('overBudget' in result) {
    return fail(429, {
      code: 'user_limit',
      message: 'Jatah analisis kamu untuk hari ini sudah habis. Analisis yang sudah dibuat tetap bisa dibuka.',
      retryAfter: result.overBudget,
    });
  }
  const { generated, news, youtube } = result;
  if (!generated.ok) return fail(generated.status, generated.error);
  return success(insightRequest, { insight: generated.insight, model: generated.model, news, youtube }, false);
}
