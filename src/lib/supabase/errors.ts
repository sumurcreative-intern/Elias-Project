import type { AuthError, PostgrestError } from '@supabase/supabase-js';

// Supabase error codes the forms can hit, in the app's language
const messages: Record<string, string> = {
  user_already_exists: 'Email ini sudah terdaftar. Silakan masuk.',
  email_exists: 'Email ini sudah terdaftar. Silakan masuk.',
  email_address_invalid: 'Alamat email tidak valid.',
  validation_failed: 'Alamat email tidak valid.',
  weak_password: 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.',
  over_email_send_rate_limit: 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.',
  over_request_rate_limit: 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.',
  signup_disabled: 'Pendaftaran sedang ditutup.',
  invalid_credentials: 'Email atau kata sandi salah.',
  email_not_confirmed: 'Email kamu belum dikonfirmasi. Buka tautan konfirmasi yang kami kirim.',
  otp_expired: 'Kode salah atau sudah kedaluwarsa.',
  same_password: 'Kata sandi baru harus berbeda dari kata sandi sebelumnya.',
};

export function errorMessage(error: AuthError | PostgrestError): string {
  if (error.code && messages[error.code]) return messages[error.code];
  // The SMTP provider refused the mail; Supabase only reports it as unexpected_failure
  if (/sending (confirmation|recovery|magic link)? ?email/i.test(error.message)) {
    // Shared with password recovery, so it doesn't promise anything about the account
    return 'Email dari Elias gagal dikirim. Coba lagi beberapa saat lagi.';
  }
  return 'Terjadi kesalahan. Silakan coba lagi.';
}
