import type { Metadata } from 'next';
import RecoveryEmailForm from '@/components/recovery/RecoveryEmailForm';
import RecoveryLayout from '@/components/recovery/RecoveryLayout';

export const metadata: Metadata = {
  title: 'Pulihkan Akun — Elias',
};

export default function ForgotPasswordPage() {
  return (
    <RecoveryLayout step={0}>
      <RecoveryEmailForm />
    </RecoveryLayout>
  );
}
