import { parseInsight } from './parse';
import { insightSchema, systemPrompt, userMessage } from './prompt';
import type { NewsContext } from '../gdelt';
import type { YouTubeTrends } from '../youtube';
import type { EliasInsight, InsightError, InsightRequest } from './types';

// Server only: reads OPENROUTER_API_KEY. Never import from a client component.

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// Tried in order through OpenRouter's `models` routing. Notes from live tests
// on 2 Nov 2026:
// - openrouter/free picks a random free model, often a reasoning one that
//   spends the whole token budget thinking and returns no content, so it is
//   the catch-all here rather than the first choice.
// - The brief's original fallbacks (meta-llama/llama-3.2-3b-instruct:free,
//   google/gemma-2-9b-it:free) are no longer listed, and an unknown id fails
//   the whole request.
// The free lineup changes often; OPENROUTER_MODELS (comma-separated, first is
// primary) overrides this without a code change.
// Only free models that support strict json_schema: Gemma lists plain JSON
// mode only, so with require_parameters every call skipped it ("No endpoints
// found", 10 Nov 2026) and landed on openrouter/free, which picked 2B models
// that wrote generic answers. Fastest first; Nemotron is the most specific
// but often takes over a minute. No openrouter/free catch-all: a clear
// "busy, try again" beats a confident generic call. xing4.0 was delisted by
// 11 Nov 2026; ERNIE flash took its place
const DEFAULT_MODELS = [
  'baidu/ernie-5.5-flash-preview:free',
  'nvidia/nemotron-3.5-super-vl:free',
  'dots-studio/dots-3-note-preview:free',
];

/** A comma-separated model list from the environment (first is primary), else the fallback. */
export function modelsFrom(value: string | undefined, fallback: string[]): string[] {
  const configured = value?.split(',').map((id) => id.trim()).filter(Boolean);
  return configured?.length ? configured : fallback;
}

function models(): string[] {
  return modelsFrom(process.env.OPENROUTER_MODELS, DEFAULT_MODELS);
}

type ChatCompletion = {
  model?: string;
  choices?: { finish_reason?: string | null; message?: { content?: string | null } }[];
  error?: { code?: number | string; message?: string };
};

export type GenerateResult = { ok: true; insight: EliasInsight; model: string } | { ok: false; status: number; error: InsightError };

function retryAfterSeconds(headers: Headers): number | undefined {
  const retryAfter = Number(headers.get('retry-after'));
  if (retryAfter > 0) return Math.ceil(retryAfter);
  // OpenRouter sends the reset as epoch milliseconds
  const reset = Number(headers.get('x-ratelimit-reset'));
  if (reset > Date.now()) return Math.ceil((reset - Date.now()) / 1000);
  return undefined;
}

/** 429s from OpenRouter come in two kinds: the free daily cap, or a per-minute burst. */
function rateLimitError(message: string, headers: Headers): InsightError {
  const retryAfter = retryAfterSeconds(headers);
  if (/per-day|daily/i.test(message)) {
    return {
      code: 'daily_limit',
      message: 'Batas harian model gratis sudah habis. Analisis baru bisa dibuat lagi setelah kuota direset.',
      retryAfter,
    };
  }
  return {
    code: 'rate_limited',
    message: 'Terlalu banyak permintaan dalam waktu singkat. Coba lagi dalam satu menit.',
    retryAfter: retryAfter ?? 60,
  };
}

const upstreamError: InsightError = {
  code: 'upstream',
  message: 'Model sedang sibuk atau tidak merespons. Coba lagi sebentar lagi.',
};

type ChatRequest = {
  /** Overrides the default model list for this call */
  models?: string[];
  messages: { role: 'system' | 'user'; content: string }[];
  schemaName: string;
  schema: object;
  maxTokens: number;
  timeoutMs: number;
};

export type CompletionResult =
  | { ok: true; content: string; model: string; finishReason: string | null | undefined }
  | { ok: false; status: number; error: InsightError };

/**
 * One request per call. Fallbacks go through OpenRouter's `models` routing,
 * so trying the next model never spends a second request of the daily quota.
 */
export async function requestCompletion({
  models: modelList = models(),
  messages,
  schemaName,
  schema,
  maxTokens,
  timeoutMs,
}: ChatRequest): Promise<CompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 503, error: { code: 'not_configured', message: 'Analisis Elias belum dikonfigurasi di server ini.' } };
  }

  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Optional attribution headers for openrouter.ai rankings
        ...(process.env.NEXT_PUBLIC_SITE_URL && { 'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL }),
        ...(process.env.NEXT_PUBLIC_SITE_NAME && { 'X-Title': process.env.NEXT_PUBLIC_SITE_NAME }),
      },
      body: JSON.stringify({
        models: modelList,
        messages,
        response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } },
        // Only route to models that honour every parameter above. Without it,
        // openrouter/free landed on cohere/north-mini-code:free (10 Nov 2026),
        // which ignores response_format and wrote JSON that didn't parse
        provider: { require_parameters: true },
        temperature: 0.4,
        // openrouter/free can land on a reasoning model, which spends output
        // tokens thinking before it answers. Keep that short and out of the
        // reply, and leave room for the JSON after it. Free models are billed
        // per request, not per token, so the headroom costs nothing
        reasoning: { effort: 'low', exclude: true },
        max_tokens: maxTokens,
      }),
      signal,
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 504, error: upstreamError };
  }

  let body: ChatCompletion | null = null;
  try {
    body = (await response.json()) as ChatCompletion;
  } catch {
    // The timeout also covers reading the body; anything else is a non-JSON
    // error page from an intermediary, handled by status below
    if (signal.aborted) return { ok: false, status: 504, error: upstreamError };
  }
  const upstreamMessage = body?.error?.message ?? '';

  if (response.status === 429 || body?.error?.code === 429) {
    return { ok: false, status: 429, error: rateLimitError(upstreamMessage, response.headers) };
  }
  if (response.status === 401 || response.status === 403) {
    console.error('OpenRouter rejected the API key:', upstreamMessage);
    return { ok: false, status: 503, error: { code: 'not_configured', message: 'Analisis Elias belum dikonfigurasi di server ini.' } };
  }
  if (!response.ok || body?.error) {
    console.error('OpenRouter error', response.status, upstreamMessage);
    return { ok: false, status: 502, error: upstreamError };
  }

  const choice = body?.choices?.[0];
  return { ok: true, content: choice?.message?.content ?? '', model: body?.model ?? modelList[0], finishReason: choice?.finish_reason };
}

export async function generateInsight(
  request: InsightRequest,
  news: NewsContext,
  youtube: YouTubeTrends,
): Promise<GenerateResult> {
  const completion = await requestCompletion({
    messages: [
      { role: 'system', content: systemPrompt(request) },
      { role: 'user', content: userMessage(request, news, youtube) },
    ],
    schemaName: 'elias_insight',
    schema: insightSchema,
    // Reasoning models spent all of 4000 thinking and returned nothing
    // (finish_reason "length", 10 Nov 2026). Free models bill per request,
    // and Nemotron needs over a minute when the faster models are busy
    maxTokens: 12_000,
    timeoutMs: 100_000,
  });
  if (!completion.ok) return completion;

  const insight = parseInsight(completion.content);
  if (!insight) {
    console.error(
      'OpenRouter reply did not match the insight contract',
      completion.model,
      completion.finishReason,
      // An excerpt is enough to see what went wrong without logging the whole reply
      JSON.stringify(completion.content).slice(0, 400),
    );
    return {
      ok: false,
      status: 502,
      error: { code: 'bad_output', message: 'Jawaban model tidak bisa dibaca. Coba lagi untuk hasil baru.' },
    };
  }
  return { ok: true, insight, model: completion.model };
}
