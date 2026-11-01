import type { Metadata } from 'next';
import AuthLayout from '@/components/AuthLayout';
import ProfileForm, { type ProfileAnswers } from '@/components/onboarding/ProfileForm';
import { onboardingFlow } from '@/components/progress/flows';
import StepList from '@/components/progress/StepList';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Lengkapi Profil — Elias',
};

export default async function OnboardingProfilePage() {
  // The proxy only lets signed-in users here; load what they saved before
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: initial } = user
    ? await supabase
        .from('profiles')
        .select('name, role, category, target_market, archetype, location, local_focus')
        .eq('id', user.id)
        .maybeSingle<ProfileAnswers>()
    : { data: null };

  return (
    <AuthLayout
      hero={{
        headline: ['PAGI KAMU,', 'KEPALA', 'JENIUS'],
        body: 'Elias membaca tren dan berita global terbaru, lalu memberi rekomendasi yang sesuai dengan brand dan peran kamu.',
        angle: '213.3deg',
        children: <StepList flow={onboardingFlow} current={1} />,
      }}
    >
      <ProfileForm initial={initial} />
    </AuthLayout>
  );
}
