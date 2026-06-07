"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import wikihisIcon from "../../../assets/wikihis.png";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

function AuthTabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative rounded-full px-3 py-2 text-xs font-black transition sm:px-4 sm:text-sm",
        active
          ? "bg-red-700 text-white shadow-[0_12px_28px_-20px_rgba(185,28,28,0.9)]"
          : "text-slate-500 hover:bg-red-50 hover:text-red-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FieldIcon({ name }) {
  const props = {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (name === "user") {
    return (
      <svg {...props}>
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg {...props}>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export default function AuthShell({ initialMode = "signin" }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let active = true;

    async function bindAuthState() {
      const supabase = await getSupabaseClient();
      if (!supabase || !active) return null;

      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (!active) return;
        if (event === "PASSWORD_RECOVERY") {
          setMode("reset");
          setRecoveryReady(true);
        }
      });

      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash.includes("type=recovery")) {
        setMode("reset");
        setRecoveryReady(true);
      }

      return () => data.subscription.unsubscribe();
    }

    const cleanupPromise = bindAuthState();

    return () => {
      active = false;
      Promise.resolve(cleanupPromise).then((cleanup) => cleanup && cleanup());
    };
  }, []);

  const pageTitle = useMemo(() => {
    if (mode === "signup") return "إنشاء حساب جديد";
    if (mode === "forgot") return "استعادة كلمة المرور";
    if (mode === "reset") return "تعيين كلمة مرور جديدة";
    return "تسجيل الدخول";
  }, [mode]);

  async function ensureProfile(supabase, user, fallbackName = "") {
    if (!user) return;
    const safeName =
      String(fallbackName || "").trim() ||
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      "مستخدم جديد";

    await supabase.from("user_profiles").upsert(
      {
        id: user.id,
        email: user.email,
        display_name: safeName,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.avatar_url || null,
      },
      { onConflict: "id" }
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error("ربط Supabase غير متاح حاليا.");

      if ((mode === "signup" || mode === "reset") && password !== confirmPassword) {
        throw new Error("كلمتا المرور غير متطابقتين.");
      }

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        setMessage("تم تسجيل الدخول بنجاح. يمكنك الآن حفظ المقالات والتعليق والتفاعل وإدارة حسابك.");
        if (typeof window !== "undefined") window.location.href = "/account";
        return;
      }

      if (mode === "signup") {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, displayName }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "تعذر إنشاء الحساب.");
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        if (signInData?.user) {
          await ensureProfile(supabase, signInData.user, displayName);
        }

        setMessage("تم إنشاء الحساب وتسجيل الدخول بنجاح.");
        if (typeof window !== "undefined") window.location.href = "/account";
        return;
      }

      if (false && mode === "signup") {
        const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth?mode=reset` : undefined;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: { display_name: displayName },
          },
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          await ensureProfile(supabase, data.user, displayName);
        }

        setMessage("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب إذا طُلب منك ذلك.");
        return;
      }

      if (mode === "forgot") {
        const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth?mode=reset` : undefined;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (resetError) throw resetError;
        setMessage("أرسلنا لك رابط استعادة كلمة المرور إلى بريدك الإلكتروني.");
        return;
      }

      if (mode === "reset") {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setMessage("تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بها.");
        setRecoveryReady(false);
        setMode("signin");
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "تعذر تنفيذ العملية المطلوبة.");
    } finally {
      setPending(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-right text-amber-950">
          فعّل إعدادات Supabase أولا حتى يعمل تسجيل الدخول وإنشاء الحساب.
        </div>
      </section>
    );
  }

  return (
    <section dir="rtl" className="bg-white px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:gap-16">
        <aside className="order-2 text-right lg:order-1">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-red-50 p-1.5">
              <Image src={wikihisIcon} alt="Wikihis" fill sizes="48px" className="object-contain p-1" />
            </div>
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-red-700">WIKIHIS</div>
              <h1 className="mt-1 text-2xl font-black text-slate-950">تواصل وتفاعل مع Wikihis</h1>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">
            حسابك يمنحك تجربة شخصية داخل الموقع: تعليقات، حفظ مقالات، ومتابعة نشاطك بدون ازدحام أو خطوات معقدة.
          </p>

          <div className="mt-8 space-y-5">
            {[
              ["حساب واحد", "ادخل مرة واحدة واستعمل الحساب للتعليق والحفظ وإدارة نشاطك."],
              ["محتوى مخصص", "احفظ المقالات المهمة وارجع إليها من صفحة الحساب في أي وقت."],
              ["التعليق على المقالات", "شارك رأيك بوضوح وتابع تفاعلاتك داخل المقالات."],
              ["نشر كمساهم", "أنشئ مقالاتك وأرسلها للمراجعة لتظهر في Wikihis."],
              ["استعادة سهلة", "أعد تعيين كلمة المرور عبر بريدك الإلكتروني عند الحاجة."],
            ].map(([title, description]) => (
              <div key={title} className="flex items-start gap-4">
                <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center text-red-700">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  <div className="text-base font-black text-slate-950">{title}</div>
                  <p className="mt-1 text-sm leading-7 text-slate-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="order-1 mx-auto w-full max-w-[430px] text-right lg:order-2">
          <div className="mb-7">
            <div className="text-xs font-black tracking-[0.2em] text-red-700">حساب WIKIHIS</div>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{pageTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              املأ البيانات بالأسفل للمتابعة. لا توجد أزرار تواصل اجتماعي، فقط بريدك وكلمة المرور.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-3 rounded-full bg-slate-100 p-1">
            <AuthTabButton active={mode === "signin"} onClick={() => setMode("signin")}>
              دخول
            </AuthTabButton>
            <AuthTabButton active={mode === "signup"} onClick={() => setMode("signup")}>
              حساب جديد
            </AuthTabButton>
            <AuthTabButton active={mode === "forgot" || mode === "reset"} onClick={() => setMode("forgot")}>
              نسيت؟
            </AuthTabButton>
          </div>

          {message ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-6 text-emerald-900 sm:text-sm sm:leading-7">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-6 text-red-900 sm:text-sm sm:leading-7">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              {mode === "signup" ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-900 sm:text-sm">الاسم الظاهر</span>
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 transition focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-50 sm:gap-3 sm:px-4">
                    <FieldIcon name="user" />
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      required
                      className="min-h-12 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 sm:min-h-14 sm:text-base"
                      placeholder="الاسم الذي سيظهر في المقالات والتعليقات"
                    />
                  </div>
                </label>
              ) : null}

              {mode !== "reset" ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-900 sm:text-sm">البريد الإلكتروني</span>
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 transition focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-50 sm:gap-3 sm:px-4">
                    <FieldIcon name="mail" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      className="min-h-12 w-full bg-transparent text-left text-sm text-slate-950 outline-none placeholder:text-slate-400 sm:min-h-14 sm:text-base"
                      placeholder="name@example.com"
                    />
                  </div>
                </label>
              ) : null}

              {mode !== "forgot" ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-900 sm:text-sm">{mode === "reset" ? "كلمة المرور الجديدة" : "كلمة المرور"}</span>
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 transition focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-50 sm:gap-3 sm:px-4">
                    <FieldIcon name="lock" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={6}
                      className="min-h-12 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 sm:min-h-14 sm:text-base"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="shrink-0 text-xs font-black text-slate-500 transition hover:text-red-700"
                    >
                      {showPassword ? "إخفاء" : "إظهار"}
                    </button>
                  </div>
                </label>
              ) : null}

              {mode === "signup" || mode === "reset" ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-900 sm:text-sm">تأكيد كلمة المرور</span>
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 transition focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-50 sm:gap-3 sm:px-4">
                    <FieldIcon name="lock" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      minLength={6}
                      className="min-h-12 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 sm:min-h-14 sm:text-base"
                      placeholder="أعد كتابة كلمة المرور"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="shrink-0 text-xs font-black text-slate-500 transition hover:text-red-700"
                    >
                      {showConfirmPassword ? "إخفاء" : "إظهار"}
                    </button>
                  </div>
                </label>
              ) : null}

              {mode === "reset" && !recoveryReady ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-6 text-amber-950 sm:text-sm sm:leading-7">
                  افتح رابط الاستعادة من بريدك الإلكتروني أولاً، وبعدها ستظهر هنا خانة تعيين كلمة المرور الجديدة.
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending || (mode === "reset" && !recoveryReady)}
                className="group mt-2 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-red-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-14 sm:px-6 sm:py-3"
              >
                <span>{pending ? "جارٍ التنفيذ..." : pageTitle}</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 transition group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            {mode === "signin" ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-black text-red-700 underline-offset-4 hover:underline"
            >
              {mode === "signin" ? "أنشئ حساباً" : "تسجيل الدخول"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
