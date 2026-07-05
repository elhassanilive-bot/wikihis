import { proxy } from "@/proxy";

export async function middleware(req) {
  return await proxy(req);
}

export const config = {
  matcher: ["/admin/:path*"],
};
