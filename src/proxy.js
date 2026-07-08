import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { isAllowedAdminEmail } from "@/config/adminAccess";

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

    if (!isAllowedAdminEmail(session.user.email)) {
      url.pathname = "/forbidden";
      return NextResponse.redirect(url);
    }
  }

  return res;
}
