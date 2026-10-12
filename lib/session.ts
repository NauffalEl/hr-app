import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type Session = { userId: string; email: string; mock: boolean };

// Placeholder = URL Supabase belum diisi (localhost / teks "your-...").
// Mock session HANYA di NODE_ENV=development; di production placeholder = buntu.
function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const placeholder =
    !url ||
    !key ||
    /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url) ||
    /your[-_]/i.test(url) ||
    /your[-_]/i.test(key);
  return !placeholder;
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabaseConfigured()) {
    if (process.env.NODE_ENV !== 'development') return null;
    return { userId: '00000000-0000-4000-8000-000000000000', email: 'mock@local.dev', mock: true };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Dipanggil dari Server Component — refresh token diperbarui middleware.
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? '', mock: false };
}
