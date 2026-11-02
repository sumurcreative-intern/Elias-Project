'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOut, X } from '@phosphor-icons/react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Logo from '../Logo';
import SignOutButton from '../SignOutButton';

// Pages land one MVP at a time (docs/MVP.md); unbuilt ones show as "Segera"
const navItems = [
  { label: 'Beranda', href: '/', ready: true },
  { label: 'Arsip', href: '/arsip', ready: true },
  { label: 'Chat', href: '/chat', ready: false },
  { label: 'Profil', href: '/profil', ready: false },
];

function NavItems({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  return navItems.map((item) => {
    const base = mobile ? 'flex items-center gap-2 py-2.5 text-md font-semibold' : 'flex items-center gap-2 text-md font-semibold';
    if (!item.ready) {
      return (
        <span key={item.href} aria-disabled className={`${base} cursor-default text-disabled-content`}>
          {item.label}
          <span className="rounded-sm bg-neutral-100 px-1.5 font-mono text-[10px] leading-[15px] font-bold">SEGERA</span>
        </span>
      );
    }
    const current = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={current ? 'page' : undefined}
        className={`${base} transition-colors ${current ? 'text-txt-black' : 'text-gray-600 hover:text-txt-black'}`}
      >
        {item.label}
        {current && !mobile && <span aria-hidden className="size-1.5 rounded-full bg-primary" />}
      </Link>
    );
  });
}

/** Header for the app pages. `signedIn` swaps the Daftar/Masuk links for Keluar. */
export default function AppHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!menuOpen || !menuRef.current) return;
      gsap.fromTo(menuRef.current, { height: 0, autoAlpha: 0 }, { height: 'auto', autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
    },
    { dependencies: [menuOpen] },
  );

  return (
    <header data-animate="header" className="sticky top-0 z-10 w-full border-b border-neutral-100 bg-bg-white">
      <div className="flex h-[72px] items-center justify-between pr-4 pl-6 md:pr-[22px] md:pl-[30px] laptop:h-20 laptop:px-[82px]">
        <div className="flex items-center gap-10">
          <Link href="/" aria-label="Elias beranda">
            <Logo priority />
          </Link>
          <nav aria-label="Navigasi utama" className="hidden items-center gap-6 laptop:flex">
            <NavItems pathname={pathname} />
          </nav>
        </div>

        {signedIn ? (
          <div className="hidden items-center laptop:flex">
            <SignOutButton className="flex items-center gap-2 rounded-md text-sm font-medium text-gray-500 transition-colors hover:text-txt-black disabled:opacity-50">
              <SignOut size={20} />
              Keluar
            </SignOutButton>
          </div>
        ) : (
          <div className="hidden items-center gap-6 laptop:flex">
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

        <button
          type="button"
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={menuOpen}
          aria-controls="app-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-neutral-100 laptop:hidden"
        >
          {menuOpen ? (
            <X size={24} className="text-neutral-700" />
          ) : (
            <Image src="/images/menu.svg" alt="" width={24} height={24} />
          )}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="app-mobile-menu"
          ref={menuRef}
          aria-label="Navigasi utama"
          className="flex flex-col gap-1 overflow-hidden border-t border-neutral-100 px-6 pt-2 pb-4 laptop:hidden"
        >
          <NavItems pathname={pathname} mobile />
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
              <Link href="/login" className="mt-2 rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-bg-white">
                Masuk
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
