'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X } from '@phosphor-icons/react';

/** What a guest sees when they try to set a priority (AR-3): a way in, not an error. */
export default function AccountPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="account-prompt-title"
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-2xl bg-bg-white p-0 text-txt-black backdrop:bg-txt-black/40"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="account-prompt-title" className="text-xl font-semibold">
            Prioritas hanya untuk pemilik akun.
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-txt-black"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-md text-neutral-600">
          Buat akun untuk <strong>menandai tren mana yang dikerjakan lebih dulu</strong> dan mengurutkan Arsip berdasarkan prioritas.
        </p>
        <div className="flex items-center justify-end gap-4">
          <Link href="/login" className="text-sm font-medium text-gray-600 transition-colors hover:text-txt-black">
            Masuk
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-bg-white transition hover:brightness-95"
          >
            Buat Akun
          </Link>
        </div>
      </div>
    </dialog>
  );
}
