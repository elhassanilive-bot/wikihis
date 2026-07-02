"use client";

import { useMemo, useState, useTransition } from "react";

export default function NewsletterSignup({ categories = [], defaultCategory = "", compact = false }) {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(defaultCategory || "كل التصنيفات");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [pending, startTransition] = useTransition();

  const categoryOptions = useMemo(() => {
    return ["كل التصنيفات", defaultCategory, ...categories]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index)
      .slice(0, 12);
  }, [categories, defaultCategory]);

  function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    startTransition(async () => {
      try {
        const response = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, category, source: "article" }),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "تعذر الاشتراك.");
        }

        setEmail("");
        setStatus({ type: "success", message: data.message || "تم الاشتراك بنجاح." });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "تعذر الاشتراك." });
      }
    });
  }

  return (
    <section className={compact ? "border border-slate-200 bg-white p-5 text-right" : "border border-red-100 bg-white px-6 py-7 text-right shadow-[0_25px_70px_-55px_rgba(127,29,29,.45)]"}>
      <div className="text-xs font-extrabold tracking-[0.18em] text-red-700">WIKIHAT NEWSLETTER</div>
      <h2 className={compact ? "mt-2 text-xl font-black text-slate-950" : "mt-3 text-2xl font-black text-slate-950"}>
        تنبيهات ذكية حسب التصنيف
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        اشترك ليصلك ملخص مختار من مقالات ويكيهات في التصنيف الذي يهمك.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="بريدك الإلكتروني"
          className="w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-red-300 focus:bg-white"
        >
          {categoryOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="red-smart-button inline-flex w-full items-center justify-center px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "جارٍ الاشتراك..." : "اشترك الآن"}
        </button>
      </form>

      {status.message ? (
        <div className={status.type === "success" ? "mt-4 text-sm font-bold text-emerald-700" : "mt-4 text-sm font-bold text-red-700"}>
          {status.message}
        </div>
      ) : null}
    </section>
  );
}
