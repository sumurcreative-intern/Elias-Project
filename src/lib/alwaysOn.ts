// "Always On" (PR-5): when the morning email is sent. Keep in sync with
// profiles_always_on_check. The briefing cron reads it for its cadence (ED-2).

export type AlwaysOn = 'significant' | 'daily';

/** PR-5 default: Elias stays quiet unless something is worth acting on (V6). */
export const DEFAULT_ALWAYS_ON: AlwaysOn = 'significant';

export const alwaysOnOptions: { value: AlwaysOn; label: string; description: string }[] = [
  {
    value: 'significant',
    label: 'Hanya saat ada hal signifikan',
    description: 'Hari tanpa sinyal yang layak ditindaklanjuti, tidak ada email.',
  },
  {
    value: 'daily',
    label: 'Setiap pagi',
    description: 'Email tetap dikirim, termasuk di hari tanpa sinyal yang kuat.',
  },
];

export const isAlwaysOn = (value: unknown): value is AlwaysOn =>
  alwaysOnOptions.some((option) => option.value === value);
