export default function LegalPageView({ page }) {
  return (
    <div className="min-h-screen bg-[#f7f5ef] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="text-right">
              <p className="text-sm font-extrabold tracking-[0.28em] text-red-700">WIKIHAT LEGAL</p>
              <h1 className="mt-4 text-4xl font-black leading-[1.45] text-slate-950 sm:text-5xl">{page.title}</h1>
              <p className="mt-4 text-sm font-semibold text-slate-500">{page.updated}</p>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{page.intro}</p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-[#faf8f3] p-7">
              <p className="text-sm font-extrabold tracking-[0.22em] text-slate-500">نقاط أساسية</p>
              <div className="mt-6 space-y-3">
                {page.highlights.map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-right text-sm font-semibold leading-7 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {page.sections.map((section) => (
            <article key={section.title} className="rounded-[1.8rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.3)]">
              <h2 className="text-right text-2xl font-black text-slate-950">{section.title}</h2>
              <div className="mt-5 space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 80)} className="text-right text-base leading-8 text-slate-600">
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
