import type { SelectOption } from '@/components/auth/fields';

// The audience a brand wants to reach; tunes what Beranda shows.
// Keep in sync with profiles_target_market_check
export const targetMarkets: SelectOption[] = [
  { value: 'gen_z', label: 'Gen Z', description: 'Usia 14–29, aktif di TikTok dan Instagram.' },
  { value: 'millennials', label: 'Milenial', description: 'Usia 30–45, mapan dan peduli nilai brand.' },
  { value: 'gen_x', label: 'Gen X & Boomer', description: 'Usia 46+, setia dan mengutamakan kepercayaan.' },
  { value: 'students', label: 'Pelajar & Mahasiswa', description: 'Sensitif harga dan cepat mengikuti tren.' },
  {
    value: 'young_professionals',
    label: 'Profesional Muda',
    description: 'Pekerja kota dengan daya beli yang terus tumbuh.',
  },
  { value: 'parents', label: 'Orang Tua & Keluarga', description: 'Mengutamakan keamanan dan manfaat keluarga.' },
  { value: 'smb', label: 'UMKM & Bisnis Kecil', description: 'Pembeli bisnis yang mencari solusi praktis.' },
  { value: 'enterprise', label: 'Korporat & Enterprise', description: 'Keputusan pembelian melibatkan banyak pihak.' },
  { value: 'general', label: 'Umum / Semua Kalangan', description: 'Konten yang relevan untuk audiens luas.' },
];

export function targetMarketLabel(value: string | null | undefined): string | null {
  return targetMarkets.find((market) => market.value === value)?.label ?? null;
}
