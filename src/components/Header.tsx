'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CaretDown, SignOut, X } from '@phosphor-icons/react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Logo from './Logo';
import SignOutButton from './SignOutButton';

const navItems = [
  { label: 'Tombol', dropdown: false, className: 'text-neutral-80' },
  { label: 'Tombol', dropdown: true, className: 'text-gray-600 py-1' },
  { label: 'Tombol', dropdown: true, className: 'text-gray-600 py-1' },
  { label: 'Alumni', dropdown: false, className: 'font-inter text-neutral-600' },
  { label: 'Acara', dropdown: false, className: 'font-inter text-neutral-600' },
  { label: 'Testimoni', dropdown: false, className: 'font-inter text-neutral-600' },
];

/**
 * `signedIn` swaps the Daftar/Masuk links for Keluar. `minimal` drops the
 * navigation and mobile menu, leaving the logo and those actions at every size.
 */
export default function Header({ signedIn, minimal = false }: { signedIn: boolean; minimal?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!menuOpen || !menuRef.current) return;
      gsap.fromTo(menuRef.current, { height: 0, autoAlpha: 0 }, { height: 'auto', autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
      gsap.fromTo(
        menuRef.current.children,
        { autoAlpha: 0, y: -8 },
        { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.04, delay: 0.1 },
      );
    },
    { dependencies: [menuOpen] },
  );

  return (
    <header
      data-animate="header"
      className="sticky top-0 z-10 w-full border-b border-neutral-100 bg-bg-white"
    >
      <div className="flex h-[72px] items-center justify-between pr-4 pl-6 md:pr-[22px] md:pl-[30px] laptop:h-20 laptop:px-[82px]">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Elias beranda">
            <Logo priority />
          </Link>
          {!minimal && (
            <nav aria-label="Navigasi utama" className="hidden items-center gap-5 laptop:flex">
              {navItems.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  className={`flex items-center gap-2 rounded-lg text-md font-semibold whitespace-nowrap transition-colors hover:text-txt-black ${item.className}`}
                >
                  {item.label}
                  {item.dropdown && <CaretDown size={24} className="text-gray-600" />}
                </button>
              ))}
            </nav>
          )}
        </div>

        {signedIn ? (
          <div className={`items-center ${minimal ? 'flex' : 'hidden laptop:flex'}`}>
            <SignOutButton className="flex items-center gap-2 rounded-md text-sm font-medium text-gray-500 transition-colors hover:text-txt-black disabled:opacity-50">
              <SignOut size={20} />
              Keluar
            </SignOutButton>
          </div>
        ) : (
          <div className={`items-center gap-6 ${minimal ? 'flex' : 'hidden laptop:flex'}`}>
            <Link href="/signup" className="rounded-md text-sm font-medium text-gray-500 transition-colors hover:text-txt-black">
              Daftar
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-bg-white transition hover:brightness-95"
            >
              Masuk
            </Link>
          </div>
        )}

        {!minimal && (
          <button
            type="button"
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-neutral-100 laptop:hidden"
          >
            {menuOpen ? (
              <X size={24} className="text-neutral-700" />
            ) : (
              <Image src="/images/menu.svg" alt="" width={24} height={24} />
            )}
          </button>
        )}
      </div>

      {menuOpen && !minimal && (
        <nav
          id="mobile-menu"
          ref={menuRef}
          aria-label="Navigasi utama"
          className="flex flex-col gap-1 overflow-hidden border-t border-neutral-100 px-6 pt-2 pb-4 laptop:hidden"
        >
          {navItems.map((item, i) => (
            <button key={i} type="button" className="py-2.5 text-left text-md font-semibold text-neutral-80">
              {item.label}
            </button>
          ))}
          {signedIn ? (
            <SignOutButton className="flex items-center gap-2 py-2.5 text-left text-md font-semibold text-neutral-80 disabled:opacity-50">
              <SignOut size={20} />
              Keluar
            </SignOutButton>
          ) : (
            <>
              <Link href="/signup" className="py-2.5 text-left text-md font-semibold text-neutral-80">
                Daftar
              </Link>
              <Link
                href="/login"
                className="mt-2 rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-bg-white"
              >
                Masuk
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
