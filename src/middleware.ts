import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isDashboardPage = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (isDashboardPage || pathname === "/") return NextResponse.redirect(new URL("/login?error=auth-config", request.url));
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: request.cookies.get("cm-remember")?.value === "1"
      ? { maxAge: 60 * 60 * 24 * 30 }
      : {},
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser validates the session with Supabase Auth and refreshes expired tokens.
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (user && (isAuthPage || pathname === "/")) {
    const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  if (!user && (isDashboardPage || pathname === "/")) {
    if (pathname === "/") return NextResponse.redirect(new URL("/login", request.url));
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/register", "/dashboard/:path*"],
};
