/**
 * Shown while today's cycle is generated, which only the first visit of the
 * WIB day waits for. Rendered outside AppShell, so no data-animate here.
 */
export default function CycleLoading() {
  return (
    <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-2 bg-bg-white px-4 text-center">
      <p className="font-mono text-xs font-bold tracking-wide text-gray-600 uppercase">Siklus hari ini</p>
      <p className="animate-pulse text-xl font-semibold">Elias sedang membaca tren hari ini.</p>
      <p className="text-md text-neutral-600">Biasanya kurang dari satu menit, dan hanya untuk pembuka hari.</p>
    </div>
  );
}
