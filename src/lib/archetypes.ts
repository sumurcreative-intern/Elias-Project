// TODO: names, descriptions and the archetype-to-tone mapping are Open
// Question 2.12. These are placeholders in Elias's register.
// Keep in sync with profiles_archetype_check.

type Archetype = {
  name: string;
  /** Shown inline in the onboarding picker (PR-4); short enough for one line on mobile */
  description: string;
  /**
   * How the archetype changes the *recommended brand output*. Elias's own voice
   * never changes with the archetype (V4); only this line does.
   */
  direction: string;
};

export const archetypeDirections: Record<string, Archetype> = {
  innocent: {
    name: 'Innocent',
    description: 'Optimis dan tulus, menawarkan rasa aman dan sederhana.',
    direction: 'bingkai dengan kejujuran dan kesederhanaan, tanpa klaim berlebihan.',
  },
  explorer: {
    name: 'Explorer',
    description: 'Petualang yang mencari kebebasan dan pengalaman baru.',
    direction: 'buka dengan tempat atau pengalaman baru, bukan produk.',
  },
  sage: {
    name: 'Sage',
    description: 'Bijak dan berwawasan, berbagi pengetahuan dan kebenaran.',
    direction: 'pimpin dengan data dan penjelasan, bukan hype.',
  },
  hero: {
    name: 'Hero',
    description: 'Berani dan tangguh, menginspirasi lewat pencapaian.',
    direction: 'posisikan audiens sebagai pihak yang menang, brand sebagai alatnya.',
  },
  outlaw: {
    name: 'Outlaw',
    description: 'Pemberontak yang mendobrak aturan dan memicu perubahan.',
    direction: 'ambil sisi yang berlawanan dengan arus utama, dengan alasan yang jelas.',
  },
  magician: {
    name: 'Magician',
    description: 'Visioner yang mewujudkan mimpi menjadi kenyataan.',
    direction: 'tunjukkan transformasi sebelum dan sesudah.',
  },
  everyman: {
    name: 'Everyman',
    description: 'Membumi dan relatable, membangun rasa kebersamaan.',
    direction: 'pakai situasi sehari-hari dan bahasa yang membumi.',
  },
  lover: {
    name: 'Lover',
    description: 'Hangat dan memikat, merayakan keintiman dan keindahan.',
    direction: 'fokus pada sensori: tekstur, warna, suasana.',
  },
  jester: {
    name: 'Jester',
    description: 'Jenaka dan spontan, membawa keceriaan di setiap momen.',
    direction: 'buka dengan punchline, bukan statement serius.',
  },
  caregiver: {
    name: 'Caregiver',
    description: 'Penuh kasih, melindungi dan merawat orang lain.',
    direction: 'tekankan manfaat dan rasa aman bagi audiens.',
  },
  creator: {
    name: 'Creator',
    description: 'Imajinatif dan inovatif, menciptakan hal yang bernilai.',
    direction: 'tampilkan proses pembuatan, bukan hanya hasil akhir.',
  },
  ruler: {
    name: 'Ruler',
    description: 'Berwibawa dan teratur, memimpin dengan kendali penuh.',
    direction: 'tampilkan standar dan kendali kualitas, dengan nada tenang dan pasti.',
  },
};
