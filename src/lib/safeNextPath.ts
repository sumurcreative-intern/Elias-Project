/** Only follow same-site paths from the query string, never a full URL. */
export function safeNextPath(next: string | null, fallback: string): string {
  return next?.startsWith('/') && !next.startsWith('//') ? next : fallback;
}
