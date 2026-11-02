/** Today's date in WIB (ISO date), the timezone every cycle runs on. */
export function todayInJakarta(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

/** The ISO date `days` days before `isoDate`. */
export function daysBefore(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** "1 November 2026" for an ISO date; dates are calendar days, so no timezone shift. */
export function formatDate(isoDate: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC', ...options }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
