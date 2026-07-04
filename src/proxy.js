import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function proxy(req) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = req.nextUrl.clone();

  if (url.pathname.startsWith("/admin")) {
    if (!session) {
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }

    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);
    if (adminEmails.length > 0 && !adminEmails.includes(session.user.email)) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
