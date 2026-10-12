import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Refresh Supabase session + guard route sederhana.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const configured =
    url && key && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url) && !/your[-_]/i.test(url) && !/your[-_]/i.test(key);

  if (configured) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          // Cookie HttpOnly + SameSite=Lax + Secure (production) — wajib lewat setAll.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    const path = request.nextUrl.pathname;
    const isProtected = !path.startsWith('/login') && !path.startsWith('/api/cron') && !path.startsWith('/_next');

    if (!user && isProtected) {
      const login = request.nextUrl.clone();
      login.pathname = '/login';
      login.search = '';
      return NextResponse.redirect(login);
    }
    if (user && path === '/login') {
      const home = request.nextUrl.clone();
      home.pathname = '/dashboard';
      return NextResponse.redirect(home);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
