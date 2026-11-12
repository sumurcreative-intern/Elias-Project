/**
 * HeroPanel headlines, one picked at random on every page load. Each is at
 * most four words on three lines, and no line is wider than "PAGI KAMU,",
 * the widest line in the design (521px at 80px Archivo Black Italic), so a
 * new phrase never wraps or clips differently from the original.
 */

/** Sign-up, onboarding and recovery: a welcome */
export const welcomeHeadlines: string[][] = [
  ['PAGI KAMU,', 'KEPALA', 'JENIUS'],
  ['HALO,', 'OTAK', 'BRILIAN.'],
  ['SELAMAT', 'DATANG,', 'JENIUS.'],
  ['TREN', 'HARI INI', 'MILIKMU.'],
  ['WAKTUNYA', 'BERKARYA,', 'JENIUS.'],
  ['KREATIF', 'TANPA', 'JEDA.'],
  ['SINYAL', 'SUDAH', 'NYALA.'],
];

/** Login: a nudge to act */
export const nudgeHeadlines: string[][] = [
  ['IDE NGGAK', 'NUNGGU', 'MOOD.'],
  ['TREN', 'NGGAK', 'NUNGGU.'],
  ['GAS', 'SEBELUM', 'BASI.'],
  ['JANGAN', 'TUNGGU', 'VIRAL.'],
  ['CEPAT', 'TAPI', 'TEPAT.'],
  ['MOOD ITU', 'CUMA', 'BONUS.'],
  ['BACA,', 'LALU', 'GERAK.'],
];

/** These pages render per request (AuthLayout reads the session), so each load picks anew */
export function randomHeadline(pool: string[][]): string[] {
  return pool[Math.floor(Math.random() * pool.length)];
}
