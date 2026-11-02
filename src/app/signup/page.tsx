import type { Metadata } from 'next';
import AuthLayout from '@/components/AuthLayout';
import { onboardingFlow } from '@/components/progress/flows';
import StepList from '@/components/progress/StepList';
import SignupForm from '@/components/signup/SignupForm';

export const metadata: Metadata = {
  title: 'Buat Akun — Elias',
};

export default function SignupPage() {
  return (
    <AuthLayout
      minimalHeader
      hero={{
        headline: ['PAGI KAMU,', 'KEPALA', 'JENIUS'],
        body: 'Elias membaca tren dan berita global terbaru, lalu memberi rekomendasi yang sesuai dengan brand dan peran kamu.',
        angle: '218.44deg',
        children: <StepList flow={onboardingFlow} current={0} />,
      }}
    >
      <SignupForm />
    </AuthLayout>
  );
}
