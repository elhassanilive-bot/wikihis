import { createMiddlewareClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function proxy(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = req.nextUrl.clone();

  if (url.pathname.startsWith("/admin")) {
    if (!session) {
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && session.user.email !== adminEmail) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
