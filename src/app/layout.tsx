import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Self-hosted (latin, variable) so builds never depend on reaching Google Fonts.
// next/font/google silently swaps in a fallback when the download fails.
const archivo = localFont({
  src: [
    { path: './fonts/Archivo-Variable.woff2', weight: '100 900', style: 'normal' },
    { path: './fonts/Archivo-Italic-Variable.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-archivo',
});

const inter = localFont({
  src: './fonts/Inter-Variable.woff2',
  weight: '100 900',
  variable: '--font-inter-family',
});

const jetbrainsMono = localFont({
  src: './fonts/JetBrainsMono-Variable.woff2',
  weight: '100 800',
  variable: '--font-jetbrains-mono',
  // The default Arial-based metric fallback would render mono text proportionally
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: 'Elias',
  description:
    'Elias membaca Trends dan berita global terbaru, lalu memberi rekomendasi yang sesuai dengan brand dan peran kamu.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${archivo.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
