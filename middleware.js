import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(req) {
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

  // تحقق من وصول لوحة الإدمن
  if (url.pathname.startsWith("/admin")) {
    if (!session) {
      // لم يسجل دخول
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }

    // تحقق من البريد الإلكتروني
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (adminEmails.length > 0 && !adminEmails.includes(session.user.email)) {
      // البريد الإلكتروني غير مصرح
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
