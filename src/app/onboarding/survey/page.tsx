import type { Metadata } from 'next';
import AuthLayout from '@/components/AuthLayout';
import SurveyForm, { type SurveyAnswers } from '@/components/onboarding/SurveyForm';
import { onboardingFlow } from '@/components/progress/flows';
import StepList from '@/components/progress/StepList';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Survei Singkat — Elias',
};

export default async function OnboardingSurveyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: initial } = user
    ? await supabase
        .from('profiles')
        .select('referral_source, referral_source_other')
        .eq('id', user.id)
        .maybeSingle<SurveyAnswers>()
    : { data: null };

  return (
    <AuthLayout
      hero={{
        headline: ['PAGI KAMU,', 'KEPALA', 'JENIUS'],
        body: 'Elias membaca tren dan berita global terbaru, lalu memberi rekomendasi yang sesuai dengan brand dan peran kamu.',
        angle: '216.34deg',
        children: <StepList flow={onboardingFlow} current={3} />,
      }}
    >
      <SurveyForm initial={initial} />
    </AuthLayout>
  );
}
