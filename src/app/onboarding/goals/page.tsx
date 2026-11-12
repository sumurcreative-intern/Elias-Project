import type { Metadata } from 'next';
import AuthLayout from '@/components/AuthLayout';
import GoalsForm, { type GoalsAnswers } from '@/components/onboarding/GoalsForm';
import { onboardingFlow } from '@/components/progress/flows';
import StepList from '@/components/progress/StepList';
import { randomHeadline, welcomeHeadlines } from '@/lib/heroHeadlines';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Tujuan & Preferensi — Elias',
};

export default async function OnboardingGoalsPage() {
  // Filled again when the user comes back from the survey
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: initial } = user
    ? await supabase.from('profiles').select('goals, notification_time, always_on').eq('id', user.id).maybeSingle<GoalsAnswers>()
    : { data: null };

  return (
    <AuthLayout
      hero={{
        headline: randomHeadline(welcomeHeadlines),
        body: <>Elias membaca tren dan berita global terbaru, lalu memberi rekomendasi yang sesuai dengan <strong>brand dan peran kamu</strong>.</>,
        angle: '216.34deg',
        children: <StepList flow={onboardingFlow} current={2} />,
      }}
    >
      <GoalsForm initial={initial} />
    </AuthLayout>
  );
}
