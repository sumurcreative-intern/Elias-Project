import type { Metadata } from 'next';
import NewPasswordForm from '@/components/recovery/NewPasswordForm';
import RecoveryLayout from '@/components/recovery/RecoveryLayout';

export const metadata: Metadata = {
  title: 'Kata Sandi Baru — Elias',
};

export default function NewPasswordPage() {
  return (
    <RecoveryLayout step={2}>
      <NewPasswordForm />
    </RecoveryLayout>
  );
}
