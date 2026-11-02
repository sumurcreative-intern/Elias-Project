'use client';

import { useState, type FormEvent } from 'react';
import type { TriggerBriefingResponse } from '@/app/api/test/trigger-briefing/route';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'sent'; id: string | null; recipient: string; topic: string; model: string; preview: string }
  | { kind: 'error'; message: string };

const field =
  'h-11 w-full rounded-lg border border-ink-20 bg-bg-white px-3 font-mono text-sm text-txt-black outline-none focus:border-txt-black';

/**
 * Runs the whole Daily Briefing chain now and emails the result, so the
 * pipeline can be checked without waiting for the QStash schedule. Dev only.
 */
export default function DevEmailTestTrigger({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [topic, setTopic] = useState('Kopi Susu');
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function trigger(event: FormEvent) {
    event.preventDefault();
    setState({ kind: 'loading' });
    try {
      const res = await fetch('/api/test/trigger-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: email, targetTopic: topic }),
      });
      const data = (await res.json()) as TriggerBriefingResponse;
      if (!data.success) return setState({ kind: 'error', message: data.error });
      setState({ kind: 'sent', id: data.id, recipient: data.recipient, topic: data.generatedTopic, model: data.model, preview: data.preview });
    } catch {
      setState({ kind: 'error', message: 'Server tidak menjawab. Cek terminal dev server.' });
    }
  }

  const loading = state.kind === 'loading';

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-ink-10 p-6">
      <p className="font-mono text-xs uppercase tracking-wider text-primary">// Daily Briefing: on-demand test</p>

      <form onSubmit={trigger} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs text-ink-50">EMAIL TUJUAN</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs text-ink-50">TOPIK TREN</span>
          <input type="text" maxLength={60} value={topic} onChange={(e) => setTopic(e.target.value)} className={field} />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-lg bg-primary px-5 font-mono text-sm font-medium text-txt-white transition-colors hover:bg-ember disabled:bg-disabled-surface disabled:text-disabled-content"
        >
          {loading ? 'Sending Briefing...' : '// TRIGGER BRIEFING EMAIL SEKARANG'}
        </button>
        {loading && <p className="font-mono text-xs text-ink-50">GDELT + YouTube + OpenRouter bisa makan waktu sampai satu menit.</p>}
      </form>

      <div aria-live="polite">
        {state.kind === 'sent' && (
          <div className="flex flex-col gap-3">
            <p className="w-fit rounded border border-success-strong bg-success-surface px-2 py-1 font-mono text-xs text-success-strong">
              TERKIRIM → {state.recipient}
            </p>
            <p className="font-mono text-xs text-ink-50">
              TOPIK: {state.topic} // MODEL: {state.model}
              {state.id && <> // RESEND ID: {state.id}</>}
            </p>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-txt-black p-4 font-mono text-xs leading-5 text-paper">
              {state.preview}
            </pre>
          </div>
        )}
        {state.kind === 'error' && (
          <p className="w-fit rounded border border-error px-2 py-1 font-mono text-xs text-error">GAGAL: {state.message}</p>
        )}
      </div>
    </section>
  );
}
