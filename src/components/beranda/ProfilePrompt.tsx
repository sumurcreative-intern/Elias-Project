import Link from 'next/link';

/** Guests always see why their feed is generic and how to fix it (BR-4). */
export default function ProfilePrompt() {
  return (
    <aside
      data-animate="page-item"
      className="flex flex-col gap-4 rounded-2xl bg-txt-black p-5 text-txt-white md:flex-row md:items-center md:justify-between md:p-6"
    >
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">Feed ini generik: tanpa peran, tanpa archetype.</p>
        <p className="text-md text-txt-white/70">
          Buat profil brand, dan setiap kartu memberi satu tindakan yang spesifik untuk peran kamu.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <Link href="/login" className="text-sm font-medium text-txt-white/70 transition-colors hover:text-txt-white">
          Masuk
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-bg-white transition hover:brightness-95"
        >
          Buat Profil
        </Link>
      </div>
    </aside>
  );
}
