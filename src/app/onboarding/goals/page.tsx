import type { Metadata } from 'next';
import AuthLayout from '@/components/AuthLayout';
import GoalsForm from '@/components/onboarding/GoalsForm';
import { onboardingFlow } from '@/components/progress/flows';
import StepList from '@/components/progress/StepList';

export const metadata: Metadata = {
  title: 'Tujuan & Preferensi — Elias',
};

export default function OnboardingGoalsPage() {
  return (
    <AuthLayout
      hero={{
        headline: ['PAGI KAMU,', 'KEPALA', 'JENIUS'],
        body: 'Elias membaca tren dan berita global terbaru, lalu memberi rekomendasi yang sesuai dengan brand dan peran kamu.',
        angle: '216.34deg',
        children: <StepList flow={onboardingFlow} current={2} />,
      }}
    >
      <GoalsForm />
    </AuthLayout>
  );
}
