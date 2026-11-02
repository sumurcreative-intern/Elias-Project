import type { Icon } from '@phosphor-icons/react';
import {
  ChatCircleText,
  EnvelopeSimpleOpen,
  Password,
  ShieldCheck,
  Target,
  User,
  UserCircleCheck,
} from '@phosphor-icons/react/ssr';

export type FlowStep = {
  /** Label in the laptop hero step list */
  short: string;
  /** Title in the tablet/mobile phase tracker */
  title: string;
  icon: Icon;
};

export type Flow = {
  /** Heading above the laptop hero step list */
  heading: string;
  steps: FlowStep[];
};

export const onboardingFlow: Flow = {
  heading: 'TAHAPAN YANG PERLU DILEWATI SAAT MEMBUAT AKUN',
  steps: [
    { short: 'Membuat Akun', title: 'Buat akun Elias', icon: User },
    { short: 'Profil Personal', title: 'Lengkapi Profil', icon: UserCircleCheck },
    { short: 'Tujuan & Preferensi', title: 'Tujuan & Preferensi', icon: Target },
    { short: 'Survei Singkat', title: 'Survei Singkat', icon: ChatCircleText },
  ],
};

export const recoveryFlow: Flow = {
  heading: 'TAHAPAN YANG PERLU DILEWATI SAAT MEMULIHKAN AKUN',
  steps: [
    { short: 'Pemulihan Email', title: 'Email Pemulihan', icon: EnvelopeSimpleOpen },
    { short: 'Verifikasi Kode OTP', title: 'Verifikasi Kode OTP', icon: ShieldCheck },
    { short: 'Buat Kata Sandi Baru', title: 'Kata Sandi Baru', icon: Password },
  ],
};
