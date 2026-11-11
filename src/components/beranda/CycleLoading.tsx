'use client';

import { useEffect, useState } from 'react';

// The server streams nothing until the cycle is done, so progress is estimated
// from the elapsed time. The bar eases towards CEILING and only the page
// arriving replaces it, so it never claims a finish that hasn't happened
const CEILING = 95;
const PACE_S = 30;

// Mirrors generate() in lib/insights/live: sources, then the trends call, then
// the per-role calls. Timed for a typical day, not tied to the real stages
const stages = [
  { from: 0, label: 'Mengumpulkan sumber: YouTube, Google, Reddit, dan berita.' },
  { from: 10, label: 'Memilih tren yang relevan untuk hari ini.' },
  { from: 45, label: 'Menyusun rekomendasi untuk tiap peran.' },
];

const SLOW_S = 90;
const STALLED_S = 180;

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Shown while today's cycle is generated, which only the first visit of the
 * WIB day waits for. Rendered outside AppShell, so no data-animate here.
 */
export default function CycleLoading() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const percent = Math.round(CEILING * (1 - Math.exp(-elapsed / PACE_S)));
  const stage = stages.findLast((s) => elapsed >= s.from) ?? stages[0];
  const note =
    elapsed >= STALLED_S
      ? <>Lebih lama dari biasanya. <strong>Muat ulang halaman aman</strong>, Elias melanjutkan siklus yang sama.</>
      : elapsed >= SLOW_S
        ? <><strong>Masih bekerja.</strong> Model sedang ramai hari ini, jadi butuh sedikit lebih lama.</>
        : <>Biasanya <strong>kurang dari satu menit</strong>, dan hanya untuk pembuka hari.</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-bg-white px-4 text-center">
      <p className="font-mono text-xs font-bold tracking-wide text-gray-600 uppercase">Siklus hari ini</p>
      <p className="text-xl font-semibold">Elias sedang membaca tren hari ini.</p>

      <div className="mt-4 flex w-full max-w-md flex-col gap-2">
        <div
          role="progressbar"
          aria-label="Perkiraan progres siklus hari ini"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`Sekitar ${percent}%`}
          className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between font-mono text-xs text-gray-600 tabular-nums">
          <span>{percent}%</span>
          <span>Berjalan {clock(elapsed)}</span>
        </div>
      </div>

      <p role="status" className="mt-2 text-md font-medium">
        {stage.label}
      </p>
      <p className="text-md text-neutral-600">{note}</p>
    </div>
  );
}
