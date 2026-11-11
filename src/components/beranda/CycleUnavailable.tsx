/**
 * The sources or the model failed. Not a quiet day (V6): Elias didn't decide
 * there was nothing worth doing, it couldn't look. Never filled with sample cards.
 */
export default function CycleUnavailable() {
  return (
    <section data-animate="page-item" className="flex flex-col gap-2 rounded-2xl border border-dashed border-disabled-surface p-6 md:p-10">
      <p className="text-xl font-semibold">Elias belum bisa membaca tren hari ini.</p>
      <p className="text-md text-neutral-600">
        Sumber data atau model sedang tidak merespons. Feed <strong>dicoba lagi otomatis dalam beberapa menit</strong>, muat ulang halaman ini nanti.
      </p>
    </section>
  );
}
