import { NextResponse } from 'next/server';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { isBrandCategory } from '@/lib/brandCategories';
import { todayInJakarta } from '@/lib/dates';
import { fetchProfile } from '@/lib/elias/brandProfile';
import { getBrandTrending, type Trending } from '@/lib/insights/trending';
import { createClient } from '@/lib/supabase/server';

export type TrendingResponse = { ok: true; trending: Trending } | { ok: false; error: { message: string } };

function fail(status: number, message: string) {
  return NextResponse.json<TrendingResponse>({ ok: false, error: { message } }, { status });
}

/**
 * POST → the latest Google searches and the YouTube topics for the caller's
 * brand category. Signed-in only: guests get the generic feed (BR-4), and the
 * live charts spend the app's YouTube quota.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (isAuthRetryableFetchError(authError)) return fail(503, 'Sesi kamu belum bisa diperiksa. Periksa koneksi lalu coba lagi.');
  if (!user) return fail(401, 'Sesi kamu sudah berakhir. Masuk lagi untuk mengambil tren terbaru.');

  // The category comes from the profile, never the request, so the button can't be pointed elsewhere
  const profile = await fetchProfile(supabase, user.id);
  if (!isBrandCategory(profile?.category)) return fail(400, 'Pilih kategori brand di profil dulu untuk mengambil tren yang sesuai.');

  const trending = await getBrandTrending(todayInJakarta(), profile.category);
  return NextResponse.json<TrendingResponse>({ ok: true, trending });
}
