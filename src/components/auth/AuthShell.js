"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import wikihisIcon from "../../../assets/wikihis.png";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

function BenefitIcon({ name, className = "" }) {
  if (name === "bookmark") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          d="M6 3h12a2 2 0 0 1 2 2v17l-8-4-8 4V5a2 2 0 0 1 2-2z"
        />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          d="M12.1 21.2l-.1.1-.1-.1C7 16.9 4 14.1 4 10.8 4 8.6 5.6 7 7.8 7c1.4 0 2.8.7 3.6 1.8.8-1.1 2.2-1.8 3.6-1.8 2.2 0 3.8 1.6 3.8 3.8 0 3.3-3 6.1-7.8 10.4z"
        />
      </svg>
    );
  }

  if (name === "comment") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path fill="none" stroke="currentColor" strokeWidth="2" d="M4 5h16v11H8l-4 4V5z" />
      </svg>
    );
  }

  if (name === "publish") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path fill="none" stroke="currentColor" strokeWidth="2" d="M4 20h16" />
        <path fill="none" stroke="currentColor" strokeWidth="2" d="M14 4l6 6-10 10H4v-6L14 4z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 2l8 4v6c0 5-3.5 9.4-8 10-4.5-.6-8-5-8-10V6l8-4z" />
    </svg>
  );
}

function AuthTabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative rounded-full px-4 py-2 text-sm font-black transition",
        active
          ? "bg-slate-950 text-white shadow-[0_16px_35px_-22px_rgba(15,23,42,0.9)]"
          : "text-slate-500 hover:bg-white hover:text-red-700",
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

  const signupBenefits = [
    {
      icon: "bookmark",
      title: "حفظ المقالات للقراءة لاحقا",
      description: "احفظ ما يعجبك في قائمة خاصة داخل حسابك مع تنظيم بسيط.",
    },
    {
      icon: "heart",
      title: "الإعجاب والتفاعل",
      description: "تفاعل مع المقالات بنقرة واحدة واطّلع الجميع على عدد الإعجابات.",
    },
    {
      icon: "comment",
      title: "التعليقات والردود",
      description: "شارك رأيك وناقش الآخرين، مع إمكانية تعديل وحذف تعليقك.",
    },
    {
      icon: "publish",
      title: "نشر مقالات كمساهم",
      description: "ارسِل مقالاتك للمراجعة، وبعد القبول تظهر مباشرة في الموقع.",
    },
  ];

  return (
    <section dir="rtl" className="relative overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_12%,rgba(185,28,28,0.18),transparent_34%),radial-gradient(circle_at_12%_88%,rgba(15,23,42,0.12),transparent_32%),linear-gradient(180deg,#fff7ed_0%,#fff_45%,#f8fafc_100%)]" />
      <div className="pointer-events-none absolute right-[-8rem] top-12 -z-10 h-72 w-72 rounded-full bg-red-700/10 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative overflow-hidden rounded-[2.2rem] bg-[linear-gradient(145deg,#09090b_0%,#111827_38%,#7f1d1d_100%)] p-6 text-white shadow-[0_35px_100px_-45px_rgba(127,29,29,0.9)] sm:p-8 lg:min-h-[680px]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-red-500 via-rose-300 to-red-900" />
          <div className="absolute -left-24 top-20 h-56 w-56 rounded-full bg-red-500/20 blur-3xl" />
          <div className="absolute bottom-[-7rem] right-[-7rem] h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-[0.26em] text-red-200">WIKIHIS ID</div>
              <div className="mt-2 text-sm font-semibold text-white/65">بوابة العضوية الذكية</div>
            </div>
            <div className="relative h-16 w-16 overflow-hidden rounded-3xl border border-white/15 bg-white p-2 shadow-2xl">
              <Image src={wikihisIcon} alt="Wikihis" fill sizes="64px" className="object-contain p-1" />
            </div>
          </div>

          <div className="relative mt-14 max-w-xl text-right">
            <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-red-100 backdrop-blur">
              تجربة تسجيل مصممة بثقة الشركات الكبيرة
            </div>
            <h1 className="mt-6 text-4xl font-black leading-[1.35] sm:text-5xl">
              حساب واحد يفتح لك التفاعل، الحفظ، والنشر داخل Wikihis.
            </h1>
            <p className="mt-5 text-base leading-8 text-white/72">
              واجهة آمنة وواضحة: سجّل دخولك، أنشئ حسابك، أو استعد كلمة المرور بخطوات قليلة وبتصميم مريح.
            </p>
          </div>

          <div className="relative mt-10 grid gap-3 sm:grid-cols-2">
            {signupBenefits.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <BenefitIcon name={item.icon} className="h-6 w-6 text-red-200" />
                <div className="mt-4 text-sm font-black">{item.title}</div>
                <p className="mt-2 text-xs leading-6 text-white/62">{item.description}</p>
              </div>
            ))}
          </div>
        </aside>

        <div className="rounded-[2.2rem] border border-white/70 bg-white/85 p-4 shadow-[0_35px_100px_-50px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-6">
          <div className="rounded-[1.8rem] border border-slate-200/80 bg-white p-5 text-right sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-red-100 bg-red-50 p-1.5">
                    <Image src={wikihisIcon} alt="Wikihis" fill sizes="48px" className="object-contain p-1" />
                  </div>
                  <div>
                    <div className="text-xs font-black tracking-[0.18em] text-red-700">حساب WIKIHIS</div>
                    <h2 className="mt-1 text-3xl font-black text-slate-950">{pageTitle}</h2>
                  </div>
                </div>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">
                  اختر العملية التي تريدها، وسنتكفل بالباقي بأبسط تجربة ممكنة.
                </p>
              </div>

              <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
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
            </div>

            {message ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold leading-7 text-emerald-900">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold leading-7 text-red-900">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === "signup" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-900">الاسم الظاهر</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-red-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-red-100">
                    <FieldIcon name="user" />
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      required
                      className="min-h-14 w-full bg-transparent text-slate-950 outline-none placeholder:text-slate-400"
                      placeholder="الاسم الذي سيظهر في المقالات والتعليقات"
                    />
                  </div>
                </label>
              ) : null}

              {mode !== "reset" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-900">البريد الإلكتروني</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-red-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-red-100">
                    <FieldIcon name="mail" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      className="min-h-14 w-full bg-transparent text-left text-slate-950 outline-none placeholder:text-slate-400"
                      placeholder="name@example.com"
                    />
                  </div>
                </label>
              ) : null}

              {mode !== "forgot" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-900">{mode === "reset" ? "كلمة المرور الجديدة" : "كلمة المرور"}</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-red-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-red-100">
                    <FieldIcon name="lock" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={6}
                      className="min-h-14 w-full bg-transparent text-slate-950 outline-none placeholder:text-slate-400"
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
                  <span className="mb-2 block text-sm font-black text-slate-900">تأكيد كلمة المرور</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-red-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-red-100">
                    <FieldIcon name="lock" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      minLength={6}
                      className="min-h-14 w-full bg-transparent text-slate-950 outline-none placeholder:text-slate-400"
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
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold leading-7 text-amber-950">
                  افتح رابط الاستعادة من بريدك الإلكتروني أولاً، وبعدها ستظهر هنا خانة تعيين كلمة المرور الجديدة.
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending || (mode === "reset" && !recoveryReady)}
                className="group mt-2 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#991b1b_0%,#dc2626_50%,#7f1d1d_100%)] px-6 py-3 text-sm font-black text-white shadow-[0_22px_45px_-28px_rgba(185,28,28,0.95)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
              >
                <span>{pending ? "جارٍ التنفيذ..." : pageTitle}</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 transition group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                بعد الدخول يمكنك إدارة حسابك، منشوراتك، وتعليقاتك من لوحة الحساب.
              </span>
              <Link href="/account" className="shrink-0 font-black text-red-700 transition hover:text-red-900">
                فتح صفحة الحساب
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
