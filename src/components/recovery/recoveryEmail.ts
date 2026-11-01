// The address entered in step 1, needed to check the code in step 2. Session
// storage keeps it out of the URL; it may be unavailable in private modes.
const KEY = 'elias:recovery-email';

export function saveRecoveryEmail(email: string) {
  try {
    sessionStorage.setItem(KEY, email);
  } catch {
    // The OTP page asks the user to start again
  }
}

export function readRecoveryEmail(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearRecoveryEmail() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear
  }
}
