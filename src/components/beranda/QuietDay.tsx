/** The no-signal branch (V6): saying nothing is a valid answer. */
export default function QuietDay({ nextCycle }: { nextCycle: string }) {
  return (
    <section data-animate="page-item" className="flex flex-col gap-2 rounded-2xl border border-dashed border-disabled-surface p-6 md:p-10">
      <p className="text-xl font-semibold">Tidak ada pergerakan yang layak ditindaklanjuti hari ini.</p>
      <p className="text-md text-neutral-600">
        Email pagi tidak dikirim. Mengulang tren kemarin tidak menambah apa pun. Siklus berikutnya {nextCycle}.
      </p>
    </section>
  );
}
