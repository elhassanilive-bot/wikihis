import { NextResponse } from "next/server";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeCategory(value) {
  const category = String(value || "كل التصنيفات").trim();
  return category.slice(0, 80) || "كل التصنيفات";
}

export async function POST(request) {
  let body = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const category = normalizeCategory(body.category);
  const source = String(body.source || "website").trim().slice(0, 80) || "website";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "أدخل بريداً إلكترونياً صحيحاً." }, { status: 400 });
  }

  const supabase = isSupabaseAdminConfigured()
    ? await getSupabaseAdminClient()
    : isSupabaseConfigured()
      ? await getSupabaseClient()
      : null;

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase غير مضبوط للنشرة البريدية." }, { status: 503 });
  }

  const { error } = await supabase.from("newsletter_subscriptions").insert({
    email,
    category,
    source,
    status: "active",
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, message: "أنت مشترك بالفعل في هذا التصنيف." });
    }

    const message = /newsletter_subscriptions/i.test(error.message || "")
      ? "شغّل ملف supabase/newsletter_subscriptions.sql أولاً ثم أعد المحاولة."
      : error.message || "تعذر حفظ الاشتراك.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "تم الاشتراك بنجاح." });
}
