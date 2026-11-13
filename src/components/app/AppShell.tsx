'use client';

import type { ReactNode } from 'react';
import { ArchiveProvider } from '@/lib/archive';
import Footer from '../Footer';
import AppHeader from './AppHeader';

/**
 * Shared frame for the app pages: header, page column, footer. Page content
 * marks its blocks with `data-animate="page-item"` to join the entrance,
 * which is CSS (globals.css, `[data-shell]`) so it plays on first paint
 * instead of after hydration. `userId` is null for guests; it scopes the
 * saved-trend archive. A page's `backdrop` is drawn behind everything,
 * header included.
 */
export default function AppShell({
  userId,
  backdrop,
  children,
}: {
  userId: string | null;
  backdrop?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ArchiveProvider userId={userId}>
      <div data-shell className="relative isolate flex min-h-screen flex-col bg-bg-white">
        {backdrop && <div className="absolute inset-0 -z-10">{backdrop}</div>}
        <AppHeader signedIn={userId !== null} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-8 md:px-[30px] md:pt-12 laptop:px-20 laptop:pt-14">
          {children}
        </main>
        <Footer />
      </div>
    </ArchiveProvider>
  );
}
