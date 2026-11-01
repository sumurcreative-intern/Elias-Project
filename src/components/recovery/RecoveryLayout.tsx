import type { ReactNode } from 'react';
import AuthLayout from '../AuthLayout';
import { recoveryFlow } from '../progress/flows';
import StepList from '../progress/StepList';

/** Auth shell with the recovery hero and step list, shared by the three recovery pages. */
export default function RecoveryLayout({ step, children }: { step: number; children: ReactNode }) {
  return (
    <AuthLayout
      spacing="tight"
      hero={{
        headline: ['PAGI KAMU,', 'KEPALA', 'JENIUS'],
        body: 'Elias membaca tren dan berita global terbaru, lalu memberi rekomendasi yang sesuai dengan brand dan peran kamu.',
        angle: '213.3deg',
        children: <StepList flow={recoveryFlow} current={step} />,
      }}
    >
      {children}
    </AuthLayout>
  );
}
