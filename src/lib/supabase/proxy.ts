import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

const SIGNED_OUT_ONLY = ["/masuk", "/daftar"];

/**
 * Menyegarkan sesi Supabase dan menulis cookie baru ke respons.
 * Pengecekan di sini hanya optimistis: otorisasi sebenarnya ada di RLS dan
 * di `requireUser()` pada tiap halaman.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = publicEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Jangan menjalankan kode lain di antara pembuatan klien dan getClaims():
  // di sinilah token disegarkan.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && pathname.startsWith("/app")) {
    return redirectWithCookies(request, response, "/masuk", { lanjut: `${pathname}${search}` });
  }
  if (signedIn && SIGNED_OUT_ONLY.includes(pathname)) {
    return redirectWithCookies(request, response, "/app");
  }
  return response;
}

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  params: Record<string, string> = {},
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = new URLSearchParams(params).toString();
  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}
