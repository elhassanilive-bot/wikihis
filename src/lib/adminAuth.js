import { redirect } from "next/navigation";
import { isAllowedAdminEmail } from "@/config/adminAccess";
import { getCurrentServerUser } from "@/lib/supabase/server";

export async function getAdminUserOrRedirect() {
  const user = await getCurrentServerUser();

  if (!user) {
    redirect("/auth");
  }

  if (!isAllowedAdminEmail(user.email)) {
    redirect("/forbidden");
  }

  return user;
}

export async function isCurrentUserAdmin() {
  const user = await getCurrentServerUser();
  return Boolean(user && isAllowedAdminEmail(user.email));
}
