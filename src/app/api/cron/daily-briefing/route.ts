import { NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';

// Called by a QStash schedule, never by a browser. /api/ is open in the proxy,
// so the signature check below is the only gate on this route.

type BriefingResponse =
  | { ok: true; status: 'skipped'; reason: 'pipeline_not_built'; delivered: 0 }
  | { ok: false; error: 'not_configured' | 'unauthorized' | 'bad_request' };

const PATH = '/api/cron/daily-briefing';

function receiver(): Receiver | null {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) return null;
  return new Receiver({ currentSigningKey, nextSigningKey });
}

/** The URL QStash signed: the public base when set, so a proxy in front of the app can't break the check. */
function signedUrl(request: Request): string {
  const base = process.env.APP_BASE_URL?.replace(/\/+$/, '');
  return base ? `${base}${PATH}` : request.url;
}

function fail(status: number, error: Extract<BriefingResponse, { ok: false }>['error']) {
  return NextResponse.json<BriefingResponse>({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const verifier = receiver();
  if (!verifier) {
    console.error('[cron/daily-briefing] QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY missing');
    return fail(500, 'not_configured');
  }

  const signature = request.headers.get('upstash-signature');
  if (!signature) return fail(401, 'unauthorized');

  // Verify against the raw text: re-serialised JSON would not match the signed hash.
  const body = await request.text();
  try {
    await verifier.verify({
      signature,
      body,
      url: signedUrl(request),
      clockTolerance: 5,
      upstashRegion: request.headers.get('upstash-region') ?? undefined,
    });
  } catch {
    return fail(401, 'unauthorized');
  }

  if (body) {
    try {
      JSON.parse(body);
    } catch {
      return fail(400, 'bad_request');
    }
  }

  // TODO(MVP 6): resolve due brand profiles by notification_time and send the
  // digest (ED-1 to ED-5). Until then a verified call is acknowledged with 200
  // and nothing is sent, so QStash does not retry it.
  return NextResponse.json<BriefingResponse>({ ok: true, status: 'skipped', reason: 'pipeline_not_built', delivered: 0 });
}
