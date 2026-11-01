import type { Metadata } from 'next';
import RecoveryLayout from '@/components/recovery/RecoveryLayout';
import VerifyCodeForm from '@/components/recovery/VerifyCodeForm';

export const metadata: Metadata = {
  title: 'Verifikasi Kode — Elias',
};

export default function VerifyCodePage() {
  return (
    <RecoveryLayout step={1}>
      <VerifyCodeForm />
    </RecoveryLayout>
  );
}
