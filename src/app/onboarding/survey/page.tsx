import type { Metadata } from 'next';
import AuthLayout from '@/components/AuthLayout';
import SurveyForm, { type SurveyAnswers } from '@/components/onboarding/SurveyForm';
import { onboardingFlow } from '@/components/progress/flows';
import StepList from '@/components/progress/StepList';
import { randomHeadline, welcomeHeadlines } from '@/lib/heroHeadlines';
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
        headline: randomHeadline(welcomeHeadlines),
        body: <>Elias membaca tren dan berita global terbaru, lalu memberi rekomendasi yang sesuai dengan <strong>brand dan peran kamu</strong>.</>,
        angle: '216.34deg',
        children: <StepList flow={onboardingFlow} current={3} />,
      }}
    >
      <SurveyForm initial={initial} />
    </AuthLayout>
  );
}
