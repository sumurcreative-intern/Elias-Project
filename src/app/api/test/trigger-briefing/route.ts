import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { creativeRoleFor } from '@/lib/creativeRoles';
import { allowedTestRecipients, devToolsEnabled } from '@/lib/devTools';
import { brandContextFor, fetchProfile } from '@/lib/elias/brandProfile';
import { executionBrief } from '@/lib/elias/brief';
import { briefingEmailHtml } from '@/lib/elias/briefingEmail';
import { refundUserBudget, takeUserBudget } from '@/lib/elias/cache';
import { generateInsight } from '@/lib/elias/openrouter';
import type { InsightRequest } from '@/lib/elias/types';
import { fetchGdeltNewsContext } from '@/lib/gdelt';
import { createClient } from '@/lib/supabase/server';
import { fetchYouTubeTrends } from '@/lib/youtube';

const DEFAULT_TOPIC = 'Kopi Susu';
const MAX_TOPIC_LENGTH = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type TriggerBriefingResponse =
  | { success: true; id: string | null; generatedTopic: string; recipient: string; model: string; preview: string }
  | { success: false; error: string };

function fail(status: number, error: string) {
  return NextResponse.json<TriggerBriefingResponse>({ success: false, error }, { status });
}

function parseBody(body: unknown): { testEmail: string | null; targetTopic: string } | null {
  if (body === null) return { testEmail: null, targetTopic: DEFAULT_TOPIC };
  if (typeof body !== 'object') return null;
  const { testEmail, targetTopic } = body as Record<string, unknown>;
  if (testEmail !== undefined && typeof testEmail !== 'string') return null;
  if (targetTopic !== undefined && typeof targetTopic !== 'string') return null;
  return {
    testEmail: testEmail?.trim().toLowerCase() || null,
    targetTopic: targetTopic?.trim().slice(0, MAX_TOPIC_LENGTH) || DEFAULT_TOPIC,
  };
}

/**
 * POST { testEmail?, targetTopic? } → runs the whole Daily Briefing chain now
 * (GDELT + YouTube → OpenRouter → Resend) instead of waiting for QStash.
 * Development only, signed-in only, and counted against the user's daily cap.
 */
export async function POST(request: Request) {
  if (!devToolsEnabled()) return fail(404, 'Not found.');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, 'Masuk dulu untuk menjalankan tes briefing.');

  let body: unknown = null;
  const raw = await request.text();
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      return fail(400, 'Body harus JSON.');
    }
  }
  const input = parseBody(body);
  if (!input) return fail(400, 'testEmail dan targetTopic harus berupa teks.');

  const allowed = allowedTestRecipients(user.email);
  const recipient = input.testEmail ?? allowed[0];
  if (!recipient) return fail(400, 'Tidak ada penerima: isi testEmail atau EMAIL_TEST_RECIPIENT.');
  if (!EMAIL_PATTERN.test(recipient)) return fail(400, 'Alamat email tidak valid.');
  if (!allowed.includes(recipient)) {
    return fail(403, 'Tes hanya boleh dikirim ke email akun kamu atau ke EMAIL_TEST_RECIPIENT.');
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return fail(500, 'RESEND_API_KEY belum diatur.');

  const profile = await fetchProfile(supabase, user.id);
  if (!profile) return fail(400, 'Lengkapi profil brand dulu: briefing dibuat untuk brand kamu.');

  const insightRequest: InsightRequest = {
    brandContext: brandContextFor(user.id, profile),
    trendTopic: input.targetTopic,
    userRole: creativeRoleFor(profile.role),
    newsKeyword: input.targetTopic,
  };

  // Same per-user cap as the Beranda card: a test run is a real OpenRouter request
  const budget = takeUserBudget(user.id);
  if (!budget.allowed) return fail(429, 'Jatah analisis kamu untuk hari ini sudah habis.');

  // Neither source can fail the run: problems come back as a status the prompt handles
  const [news, youtube] = await Promise.all([fetchGdeltNewsContext(input.targetTopic), fetchYouTubeTrends('ID', 3)]);
  const generated = await generateInsight(insightRequest, news, youtube);
  if (!generated.ok) {
    if (generated.status === 429 || generated.status === 503) refundUserBudget(user.id);
    return fail(500, `OpenRouter: ${generated.error.message}`);
  }

  const { insight, model } = generated;
  const brief = { trendTopic: input.targetTopic, role: insightRequest.userRole, insight, news, youtube };
  const preview = executionBrief(brief);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Elias <onboarding@resend.dev>',
    to: recipient,
    subject: `[TEST] ${insight.headline}`.slice(0, 150),
    html: briefingEmailHtml({ label: '// DAILY BRIEFING: ON-DEMAND TEST', ...brief }),
    text: preview,
  });
  if (error) {
    console.error('[test/trigger-briefing] Resend:', error.name, error.message);
    return fail(500, `Resend: ${error.message}`);
  }

  return NextResponse.json<TriggerBriefingResponse>({
    success: true,
    id: data?.id ?? null,
    generatedTopic: input.targetTopic,
    recipient,
    model,
    preview,
  });
}
