/** A failed lookup, with a message ready to show the user. */
export class LocateError extends Error {}

/**
 * Asks the browser for the user's position (this triggers the permission prompt)
 * and turns it into a "Regency/city, province, country" label.
 */
export async function locateUser(): Promise<string> {
  // Geolocation only exists in secure contexts: https, or localhost in development
  if (!('geolocation' in navigator)) {
    throw new LocateError('Browser kamu tidak mendukung akses lokasi. Isi lokasi secara manual.');
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10_000, maximumAge: 600_000 }),
  ).catch((error: GeolocationPositionError) => {
    throw new LocateError(
      error.code === error.PERMISSION_DENIED
        ? 'Akses lokasi ditolak. Izinkan di pengaturan browser atau isi lokasi secara manual.'
        : 'Lokasi kamu tidak dapat ditemukan. Coba lagi atau isi lokasi secara manual.',
    );
  });

  // Free keyless reverse geocoding meant for browser use; city level is all we keep
  const { latitude, longitude } = position.coords;
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=id`,
  ).catch(() => null);
  if (!response?.ok) {
    throw new LocateError('Gagal membaca nama lokasi kamu. Coba lagi atau isi lokasi secara manual.');
  }

  const label = formatLocation(await response.json());
  if (!label) {
    throw new LocateError('Lokasi kamu tidak dikenali. Isi lokasi secara manual.');
  }
  return label;
}

type AdminArea = { adminLevel?: number; name?: string; description?: string };

type Place = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  countryCode?: string;
  localityInfo?: { administrative?: AdminArea[] };
};

/**
 * "Regency/city, province, country", e.g. "Kabupaten Bandung, Jawa Barat, Indonesia".
 * Admin level 5 is the regency/city: `city` can be a village inside a regency
 * ("Soreang"), and principalSubdivision is the island in Indonesia ("Jawa").
 */
export function formatLocation(place: Place): string {
  const areas = place.localityInfo?.administrative ?? [];
  const level4 = areas.filter((area) => area.adminLevel === 4);

  // Some cities are mistagged at the province's level (Kota Yogyakarta), but described as a kota
  const regency =
    areas.find((area) => area.adminLevel === 5) ??
    level4.find((area) => /^(kota|kabupaten)\b/i.test(area.description ?? ''));
  const city = regency?.name ? withRegencyType(regency, areas, place.countryCode) : place.city || place.locality;
  const province = level4.find((area) => area !== regency)?.name || place.principalSubdivision;

  // Drop gaps and repeats, e.g. a city that is also its own province
  return [city, province, place.countryName]
    .filter((part): part is string => Boolean(part))
    .filter((part, i, parts) => part !== parts[i - 1])
    .join(', ');
}

/** Indonesia has a Kota and a Kabupaten of the same name (Bandung), so keep the type. */
function withRegencyType({ name = '', description = '' }: AdminArea, areas: AdminArea[], countryCode?: string) {
  if (countryCode !== 'ID' || /^(kota|kabupaten)\b/i.test(name)) return name;

  // Usually the area's own description says it ("kabupaten di Provinsi Jawa Barat"); a provincial
  // capital's doesn't ("ibukota Provinsi Bali"), but its districts do ("kecamatan di Kota Denpasar")
  const own = description.match(/^(kota|kabupaten)\b/i)?.[1];
  const fromDistrict = areas
    .map((area) => area.description?.match(new RegExp(`\\b(Kota|Kabupaten)(?: Administrasi)? ${escapeRegExp(name)}\\b`))?.[1])
    .find(Boolean);
  const type = own ?? fromDistrict;
  return type ? `${type[0].toUpperCase()}${type.slice(1).toLowerCase()} ${name}` : name;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
