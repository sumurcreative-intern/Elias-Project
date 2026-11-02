// TODO: names, descriptions and the archetype-to-tone mapping are Open
// Question 2.12. These directions are placeholders in Elias's register.
// Keep in sync with profiles_archetype_check.

/**
 * How an archetype changes the *recommended brand output*. Elias's own voice
 * never changes with the archetype (V4); only this line does.
 */
export const archetypeDirections: Record<string, { name: string; direction: string }> = {
  innocent: { name: 'Innocent', direction: 'bingkai dengan kejujuran dan kesederhanaan, tanpa klaim berlebihan.' },
  explorer: { name: 'Explorer', direction: 'buka dengan tempat atau pengalaman baru, bukan produk.' },
  sage: { name: 'Sage', direction: 'pimpin dengan data dan penjelasan, bukan hype.' },
  hero: { name: 'Hero', direction: 'posisikan audiens sebagai pihak yang menang, brand sebagai alatnya.' },
  outlaw: { name: 'Outlaw', direction: 'ambil sisi yang berlawanan dengan arus utama, dengan alasan yang jelas.' },
  magician: { name: 'Magician', direction: 'tunjukkan transformasi sebelum dan sesudah.' },
  everyman: { name: 'Everyman', direction: 'pakai situasi sehari-hari dan bahasa yang membumi.' },
  lover: { name: 'Lover', direction: 'fokus pada sensori: tekstur, warna, suasana.' },
  jester: { name: 'Jester', direction: 'buka dengan punchline, bukan statement serius.' },
  caregiver: { name: 'Caregiver', direction: 'tekankan manfaat dan rasa aman bagi audiens.' },
  creator: { name: 'Creator', direction: 'tampilkan proses pembuatan, bukan hanya hasil akhir.' },
  ruler: { name: 'Ruler', direction: 'tampilkan standar dan kendali kualitas, dengan nada tenang dan pasti.' },
};
