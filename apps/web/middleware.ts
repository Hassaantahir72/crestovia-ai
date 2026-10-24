import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Legacy-key fallback for existing setups.

  if (!url || !key) {
    // Do not silently treat an unconfigured app as authenticated.
    if (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/onboarding") || request.nextUrl.pathname.startsWith("/admin")) {
      const target = request.nextUrl.clone();
      target.pathname = "/login";
      target.searchParams.set("configuration", "missing");
      return NextResponse.redirect(target);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if ((request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/onboarding") || request.nextUrl.pathname.startsWith("/admin")) && !user) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(target);
  }
  if (request.nextUrl.pathname === "/login" && user && request.nextUrl.searchParams.get("mfa") !== "required") {
    const target = request.nextUrl.clone();
    target.pathname = "/dashboard";
    return NextResponse.redirect(target);
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/admin/:path*", "/admin", "/login"],
};
