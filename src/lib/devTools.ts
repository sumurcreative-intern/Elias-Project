// Developer-only tools (the on-demand briefing trigger). Off in production
// unless ELIAS_DEV_TOOLS=1, because each run spends real OpenRouter and Resend quota.
export function devToolsEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ELIAS_DEV_TOOLS === '1';
}

/**
 * Where a test briefing may go: EMAIL_TEST_RECIPIENT (comma-separated) and the
 * signed-in user's own address. Never an arbitrary inbox.
 */
export function allowedTestRecipients(userEmail: string | undefined): string[] {
  const configured = (process.env.EMAIL_TEST_RECIPIENT ?? '').split(',');
  return [...new Set([...configured, userEmail ?? ''].map((email) => email.trim().toLowerCase()).filter(Boolean))];
}
