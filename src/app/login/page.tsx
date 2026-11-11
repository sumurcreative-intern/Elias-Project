import type { Metadata } from 'next';
import AuthLayout from '@/components/AuthLayout';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Masuk — Elias',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Set by /auth/confirm and /auth/callback when a confirmation link fails
  const { error } = await searchParams;

  return (
    <AuthLayout
      minimalHeader
      hero={{
        headline: ['IDE NGGAK', 'NUNGGU', 'MOOD.'],
        body: <>Elias membaca Trends dan berita global terbaru, lalu memberi rekomendasi yang sesuai dengan <strong>brand dan peran kamu</strong>.</>,
        angle: '215.67deg',
      }}
    >
      <LoginForm
        initialStatus={
          error === 'link'
            ? { tone: 'error', text: 'Tautan konfirmasi tidak valid atau sudah kedaluwarsa. Silakan masuk atau daftar lagi.' }
            : null
        }
      />
    </AuthLayout>
  );
}
